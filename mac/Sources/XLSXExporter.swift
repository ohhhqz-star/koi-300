import Foundation

struct XLSheet {
    var name: String
    var columnWidths: [Double]
    var rows: [[XLCell]]
    var freezeRows: Int = 0
    var autoFilter: String? = nil
    var merges: [String] = []
    var rowHeights: [Int: Double] = [:]
}

struct XLCell {
    enum Value {
        case text(String)
        case number(Double)
        case blank
    }

    var value: Value
    var style: XLStyle

    static func text(_ text: String, _ style: XLStyle = .textCell) -> XLCell {
        XLCell(value: .text(text), style: style)
    }

    static func number(_ value: Double, _ style: XLStyle = .money) -> XLCell {
        XLCell(value: .number(value), style: style)
    }

    static func blank(_ style: XLStyle = .normal) -> XLCell {
        XLCell(value: .blank, style: style)
    }

    static func pnl(_ value: Double, percent: Bool = false) -> XLCell {
        let style: XLStyle
        if value > 0 {
            style = percent ? .gainPercent : .gainMoney
        } else if value < 0 {
            style = percent ? .lossPercent : .lossMoney
        } else {
            style = percent ? .percent : .money
        }
        return XLCell(value: .number(value), style: style)
    }
}

enum XLStyle: Int {
    case normal = 0
    case title = 1
    case subtitle = 2
    case header = 3
    case money = 4
    case percent = 5
    case textCell = 6
    case totalLabel = 7
    case totalMoney = 8
    case totalPercent = 9
    case caption = 10
    case center = 11
    case gainMoney = 12
    case lossMoney = 13
    case gainPercent = 14
    case lossPercent = 15
    case wrap = 16
    case section = 17
}

enum XLSXError: LocalizedError {
    case zipFailed(Int32)
    case packageFailed(String)

    var errorDescription: String? {
        switch self {
        case .zipFailed(let code): return "生成 xlsx 压缩包失败（zip 退出码 \(code)）。"
        case .packageFailed(let message): return message
        }
    }
}

enum XLSXExporter {
    static func write(sheets: [XLSheet], to outputURL: URL) throws {
        guard !sheets.isEmpty else { throw XLSXError.packageFailed("没有可导出的工作表。") }
        let fm = FileManager.default
        let temp = fm.temporaryDirectory.appendingPathComponent("InvestmentReview-\(UUID().uuidString)", isDirectory: true)
        try fm.createDirectory(at: temp.appendingPathComponent("_rels"), withIntermediateDirectories: true)
        try fm.createDirectory(at: temp.appendingPathComponent("xl/worksheets"), withIntermediateDirectories: true)
        try fm.createDirectory(at: temp.appendingPathComponent("xl/_rels"), withIntermediateDirectories: true)
        defer { try? fm.removeItem(at: temp) }

        try writeFile(contentTypes(sheets: sheets), to: temp.appendingPathComponent("[Content_Types].xml"))
        try writeFile(rootRels(), to: temp.appendingPathComponent("_rels/.rels"))
        try writeFile(workbook(sheets: sheets), to: temp.appendingPathComponent("xl/workbook.xml"))
        try writeFile(workbookRels(sheets: sheets), to: temp.appendingPathComponent("xl/_rels/workbook.xml.rels"))
        try writeFile(stylesXML(), to: temp.appendingPathComponent("xl/styles.xml"))

        for (index, sheet) in sheets.enumerated() {
            try writeFile(worksheet(sheet, selected: index == 0), to: temp.appendingPathComponent("xl/worksheets/sheet\(index + 1).xml"))
        }

        if fm.fileExists(atPath: outputURL.path) {
            try fm.removeItem(at: outputURL)
        }
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/zip")
        process.currentDirectoryURL = temp
        process.arguments = ["-qr", outputURL.path, "."]
        let pipe = Pipe()
        process.standardError = pipe
        process.standardOutput = pipe
        try process.run()
        process.waitUntilExit()
        guard process.terminationStatus == 0 else {
            throw XLSXError.zipFailed(process.terminationStatus)
        }
        guard fm.fileExists(atPath: outputURL.path) else {
            throw XLSXError.packageFailed("导出文件没有生成。")
        }
    }

    private static func writeFile(_ content: String, to url: URL) throws {
        guard let data = content.data(using: .utf8) else {
            throw XLSXError.packageFailed("无法编码 XML。")
        }
        try data.write(to: url, options: .atomic)
    }

    // MARK: - Package parts

    private static func contentTypes(sheets: [XLSheet]) -> String {
        var overrides = ""
        for index in sheets.indices {
            overrides += "<Override PartName=\"/xl/worksheets/sheet\(index + 1).xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>"
        }
        return """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
        <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
        \(overrides)
        </Types>
        """
    }

    private static func rootRels() -> String {
        """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
        </Relationships>
        """
    }

    private static func workbook(sheets: [XLSheet]) -> String {
        var sheetTags = ""
        for (index, sheet) in sheets.enumerated() {
            let name = escapeAttribute(sheet.name)
            sheetTags += "<sheet name=\"\(name)\" sheetId=\"\(index + 1)\" r:id=\"rId\(index + 1)\"/>"
        }
        return """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <workbookPr date1904="false"/>
        <bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="15000"/></bookViews>
        <sheets>\(sheetTags)</sheets>
        <calcPr calcId="191029"/>
        </workbook>
        """
    }

    private static func workbookRels(sheets: [XLSheet]) -> String {
        var rels = ""
        for index in sheets.indices {
            rels += "<Relationship Id=\"rId\(index + 1)\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet\(index + 1).xml\"/>"
        }
        rels += "<Relationship Id=\"rId\(sheets.count + 1)\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/>"
        return """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        \(rels)
        </Relationships>
        """
    }

    private static func stylesXML() -> String {
        """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <numFmts count="2">
        <numFmt numFmtId="164" formatCode="#,##0.00"/>
        <numFmt numFmtId="165" formatCode="0.00%"/>
        </numFmts>
        <fonts count="8">
        <font><name val="PingFang SC"/><family val="2"/><sz val="11"/></font>
        <font><name val="PingFang SC"/><family val="2"/><b/><color rgb="FFFFFFFF"/><sz val="11"/></font>
        <font><name val="PingFang SC"/><family val="2"/><b/><color rgb="FF1F3D39"/><sz val="11"/></font>
        <font><name val="PingFang SC"/><family val="2"/><color rgb="FF77736B"/><sz val="9"/></font>
        <font><name val="PingFang SC"/><family val="2"/><b/><color rgb="FF1F3D39"/><sz val="18"/></font>
        <font><name val="PingFang SC"/><family val="2"/><color rgb="FFA63A34"/><sz val="11"/></font>
        <font><name val="PingFang SC"/><family val="2"/><color rgb="FF1B7A54"/><sz val="11"/></font>
        <font><name val="PingFang SC"/><family val="2"/><b/><color rgb="FF1F3D39"/><sz val="12"/></font>
        </fonts>
        <fills count="4">
        <fill><patternFill patternType="none"/></fill>
        <fill><patternFill patternType="gray125"/></fill>
        <fill><patternFill patternType="solid"><fgColor rgb="FF1F4E4A"/><bgColor indexed="64"/></patternFill></fill>
        <fill><patternFill patternType="solid"><fgColor rgb="FFF3F1EA"/><bgColor indexed="64"/></patternFill></fill>
        </fills>
        <borders count="2">
        <border><left/><right/><top/><bottom/><diagonal/></border>
        <border>
        <left style="thin"><color rgb="FFE0DCD2"/></left>
        <right style="thin"><color rgb="FFE0DCD2"/></right>
        <top style="thin"><color rgb="FFE0DCD2"/></top>
        <bottom style="thin"><color rgb="FFE0DCD2"/></bottom>
        <diagonal/>
        </border>
        </borders>
        <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
        <cellXfs count="18">
        <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
        <xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
        <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
        <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
        <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
        <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
        <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
        <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
        <xf numFmtId="164" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
        <xf numFmtId="165" fontId="2" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
        <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>
        <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
        <xf numFmtId="164" fontId="5" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
        <xf numFmtId="164" fontId="6" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
        <xf numFmtId="165" fontId="5" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
        <xf numFmtId="165" fontId="6" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
        <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>
        <xf numFmtId="0" fontId="7" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
        </cellXfs>
        <cellStyles count="1"><cellStyle name="常规" xfId="0" builtinId="0"/></cellStyles>
        <dxfs count="0"/>
        <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
        </styleSheet>
        """
    }

    private static func worksheet(_ sheet: XLSheet, selected: Bool) -> String {
        let lastRow = max(sheet.rows.count, 1)
        let lastColumn = max(sheet.columnWidths.count, sheet.rows.map(\.count).max() ?? 1, 1)
        let dimension = "A1:\(columnName(lastColumn))\(lastRow)"

        var cols = "<cols>"
        for (index, width) in sheet.columnWidths.enumerated() {
            cols += "<col min=\"\(index + 1)\" max=\"\(index + 1)\" width=\"\(String(format: "%.2f", width))\" customWidth=\"1\"/>"
        }
        cols += "</cols>"

        var sheetData = "<sheetData>"
        for (rowIndex, row) in sheet.rows.enumerated() {
            let r = rowIndex + 1
            var rowAttrs = " r=\"\(r)\""
            if let height = sheet.rowHeights[r] {
                rowAttrs += " ht=\"\(String(format: "%.1f", height))\" customHeight=\"1\""
            }
            sheetData += "<row\(rowAttrs)>"
            for (columnIndex, cell) in row.enumerated() {
                let coordinate = "\(columnName(columnIndex + 1))\(r)"
                let styleAttr = cell.style == .normal ? "" : " s=\"\(cell.style.rawValue)\""
                switch cell.value {
                case .blank:
                    if cell.style != .normal {
                        sheetData += "<c r=\"\(coordinate)\"\(styleAttr)/>"
                    }
                case .text(let value):
                    let escaped = escapeText(value)
                    sheetData += "<c r=\"\(coordinate)\"\(styleAttr) t=\"inlineStr\"><is><t xml:space=\"preserve\">\(escaped)</t></is></c>"
                case .number(let value):
                    let safe = value.isFinite ? value : 0
                    sheetData += "<c r=\"\(coordinate)\"\(styleAttr)><v>\(formatNumber(safe))</v></c>"
                }
            }
            sheetData += "</row>"
        }
        sheetData += "</sheetData>"

        let view: String
        if sheet.freezeRows > 0 {
            let topLeft = "A\(sheet.freezeRows + 1)"
            view = "<sheetViews><sheetView showGridLines=\"0\"\(selected ? " tabSelected=\"1\"" : "") workbookViewId=\"0\"><pane ySplit=\"\(sheet.freezeRows)\" topLeftCell=\"\(topLeft)\" activePane=\"bottomLeft\" state=\"frozen\"/><selection pane=\"bottomLeft\" activeCell=\"\(topLeft)\" sqref=\"\(topLeft)\"/></sheetView></sheetViews>"
        } else {
            view = "<sheetViews><sheetView showGridLines=\"0\"\(selected ? " tabSelected=\"1\"" : "") workbookViewId=\"0\"><selection activeCell=\"A1\" sqref=\"A1\"/></sheetView></sheetViews>"
        }

        var extra = ""
        if let autoFilter = sheet.autoFilter, !autoFilter.isEmpty {
            extra += "<autoFilter ref=\"\(autoFilter)\"/>"
        }
        if !sheet.merges.isEmpty {
            extra += "<mergeCells count=\"\(sheet.merges.count)\">"
            for merge in sheet.merges {
                extra += "<mergeCell ref=\"\(merge)\"/>"
            }
            extra += "</mergeCells>"
        }

        return """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
        <dimension ref="\(dimension)"/>
        \(view)
        <sheetFormatPr defaultRowHeight="20"/>
        \(cols)
        \(sheetData)
        \(extra)
        <pageMargins left="0.6" right="0.6" top="0.7" bottom="0.7" header="0.3" footer="0.3"/>
        <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0" paperSize="9"/>
        </worksheet>
        """
    }

    // MARK: - Helpers

    private static func columnName(_ index: Int) -> String {
        var value = index
        var result = ""
        while value > 0 {
            value -= 1
            let scalar = UnicodeScalar(65 + value % 26)!
            result = String(scalar) + result
            value /= 26
        }
        return result
    }

    private static func formatNumber(_ value: Double) -> String {
        if value == value.rounded() && abs(value) < 1e15 {
            return String(format: "%.0f", value)
        }
        return String(format: "%.10g", value)
    }

    private static func escapeText(_ text: String) -> String {
        var output = ""
        for scalar in text.unicodeScalars {
            switch scalar {
            case "&": output += "&amp;"
            case "<": output += "&lt;"
            case ">": output += "&gt;"
            case "\"": output += "&quot;"
            default:
                if scalar.value < 0x20 && scalar != "\n" && scalar != "\t" {
                    continue
                }
                output.unicodeScalars.append(scalar)
            }
        }
        return output
    }

    private static func escapeAttribute(_ text: String) -> String {
        escapeText(text).replacingOccurrences(of: "\n", with: " ")
    }
}

enum WorkbookBuilder {
    static func sheets(from data: AppData, storeTotals: (cost: Double, value: Double, cash: Double)? = nil) -> [XLSheet] {
        let totalCost = storeTotals?.cost ?? data.assets.reduce(0) { $0 + $1.cost }
        let totalValue = storeTotals?.value ?? data.assets.reduce(0) { $0 + $1.value }
        let totalCash = storeTotals?.cash ?? data.assets.filter { $0.category == AssetCategory.cash.rawValue }.reduce(0) { $0 + $1.value }
        let totalPnL = totalValue - totalCost
        let totalRate = totalCost == 0 ? 0 : totalPnL / totalCost
        let holdingsValue = totalValue - totalCash

        return [
            overviewSheet(data: data, totalCost: totalCost, totalValue: totalValue, totalPnL: totalPnL, totalRate: totalRate, totalCash: totalCash, holdingsValue: holdingsValue),
            holdingsSheet(data: data, totalCost: totalCost, totalValue: totalValue, totalPnL: totalPnL, totalRate: totalRate),
            tradesSheet(data: data),
            reviewsSheet(data: data),
            plansSheet(data: data),
            snapshotsSheet(data: data)
        ]
    }

    private static func overviewSheet(
        data: AppData,
        totalCost: Double,
        totalValue: Double,
        totalPnL: Double,
        totalRate: Double,
        totalCash: Double,
        holdingsValue: Double
    ) -> XLSheet {
        let columns: [Double] = [18, 16, 16, 16, 14, 14]
        var rows: [[XLCell]] = []
        var merges: [String] = []
        var heights: [Int: Double] = [:]

        merges.append("A1:F1")
        rows.append([.text("Koi 300 · 数据导出", .title)] + Array(repeating: .blank(.title), count: 5))
        heights[1] = 34

        let stamp = exportDateString()
        merges.append("A2:F2")
        rows.append([.text("导出时间 \(stamp)　｜　数据截至 \(DateFmt.dateTimeChinese.string(from: data.lastModified))　｜　金额单位：元", .subtitle)] +
                    Array(repeating: .blank(.subtitle), count: 5))
        heights[2] = 22

        rows.append(Array(repeating: .blank(), count: 6))
        merges.append("A4:F4")
        rows.append([.text("关键指标", .section)] + Array(repeating: .blank(.section), count: 5))
        heights[4] = 24

        rows.append(["总投入成本", "当前总资产", "浮动盈亏", "盈亏率", "现金", "持仓市值"].map { .text($0, .header) })
        heights[5] = 28

        rows.append([
            .number(totalCost, .money),
            .number(totalValue, .money),
            .pnl(totalPnL),
            .pnl(totalRate, percent: true),
            .number(totalCash, .money),
            .number(holdingsValue, .money)
        ])

        rows.append(Array(repeating: .blank(), count: 6))

        merges.append("A8:F8")
        rows.append([.text("账户分布", .section)] + Array(repeating: .blank(.section), count: 5))
        heights[8] = 24
        rows.append(["账户", "投入成本", "当前市值", "浮动盈亏", "盈亏率", "占总资产"].map { .text($0, .header) })
        heights[9] = 24

        var accountOrder: [String] = []
        var accountCost: [String: Double] = [:]
        var accountValue: [String: Double] = [:]
        for asset in data.assets {
            if !accountOrder.contains(asset.account) { accountOrder.append(asset.account) }
            accountCost[asset.account, default: 0] += asset.cost
            accountValue[asset.account, default: 0] += asset.value
        }
        for account in accountOrder {
            let cost = accountCost[account] ?? 0
            let value = accountValue[account] ?? 0
            let pnl = value - cost
            rows.append([
                .text(account, .textCell),
                .number(cost, .money),
                .number(value, .money),
                .pnl(pnl),
                .pnl(cost == 0 ? 0 : pnl / cost, percent: true),
                .number(totalValue == 0 ? 0 : value / totalValue, .percent)
            ])
        }
        rows.append([
            .text("合计", .totalLabel),
            .number(totalCost, .totalMoney),
            .number(totalValue, .totalMoney),
            .number(totalPnL, .totalMoney),
            .number(totalRate, .totalPercent),
            .number(1, .totalPercent)
        ])

        rows.append(Array(repeating: .blank(), count: 6))
        let categorySectionRow = rows.count + 1
        merges.append("A\(categorySectionRow):F\(categorySectionRow)")
        rows.append([.text("资产类别", .section)] + Array(repeating: .blank(.section), count: 5))
        heights[categorySectionRow] = 24
        rows.append(["类别", "投入成本", "当前市值", "浮动盈亏", "盈亏率", "占总资产"].map { .text($0, .header) })
        heights[categorySectionRow + 1] = 24

        for category in AssetCategory.allCases {
            let items = data.assets.filter { $0.category == category.rawValue }
            guard !items.isEmpty else { continue }
            let cost = items.reduce(0) { $0 + $1.cost }
            let value = items.reduce(0) { $0 + $1.value }
            let pnl = value - cost
            rows.append([
                .text(category.rawValue, .textCell),
                .number(cost, .money),
                .number(value, .money),
                .pnl(pnl),
                .pnl(cost == 0 ? 0 : pnl / cost, percent: true),
                .number(totalValue == 0 ? 0 : value / totalValue, .percent)
            ])
        }
        rows.append([
            .text("合计", .totalLabel),
            .number(totalCost, .totalMoney),
            .number(totalValue, .totalMoney),
            .number(totalPnL, .totalMoney),
            .number(totalRate, .totalPercent),
            .number(1, .totalPercent)
        ])

        rows.append(Array(repeating: .blank(), count: 6))
        let notesRow = rows.count + 1
        merges.append("A\(notesRow):F\(notesRow)")
        rows.append([.text("说明", .section)] + Array(repeating: .blank(.section), count: 5))
        heights[notesRow] = 24

        let notes = [
            "金额单位：元；占总资产按当前总资产（含现金）计算，四舍五入可能有 ±0.1% 的误差。",
            "持仓成本与当前市值由用户在本地应用中维护；操作记录用于复盘，不自动回写持仓成本。",
            "本文件由“Koi 300”本地应用导出，数据只保存在这台 Mac 上。"
        ]
        for note in notes {
            let row = rows.count + 1
            merges.append("A\(row):F\(row)")
            rows.append([.text(note, .caption)] + Array(repeating: .blank(.caption), count: 5))
            heights[row] = 20
        }

        return XLSheet(
            name: "概览",
            columnWidths: columns,
            rows: rows,
            merges: merges,
            rowHeights: heights
        )
    }

    private static func holdingsSheet(data: AppData, totalCost: Double, totalValue: Double, totalPnL: Double, totalRate: Double) -> XLSheet {
        let headers = ["账户", "类别", "代码", "名称 / 标的", "投入成本", "当前市值", "浮动盈亏", "盈亏率", "仓位占比", "数量 / 份额", "成本价 / 净值", "现价 / 净值", "我的记录 / 现状", "下一步 / 退出条件", "数据状态"]
        let widths: [Double] = [16, 12, 10, 32, 14, 14, 14, 10, 10, 10, 12, 12, 36, 30, 12]
        var rows: [[XLCell]] = []
        let merges: [String] = ["A1:O1", "A2:O2"]
        var heights: [Int: Double] = [1: 34, 2: 22, 3: 32]

        rows.append([.text("当前持仓", .title)] + Array(repeating: .blank(.title), count: 14))
        rows.append([.text("共 \(data.assets.count) 条资产记录　｜　金额单位：元　｜　浮动盈亏按“当前市值 − 投入成本”计算", .subtitle)] + Array(repeating: .blank(.subtitle), count: 14))
        rows.append(headers.map { .text($0, .header) })

        for asset in data.assets {
            let row = [
                XLCell.text(asset.account, .textCell),
                XLCell.text(asset.category, .center),
                XLCell.text(asset.code, .center),
                XLCell.text(asset.name, .textCell),
                XLCell.number(asset.cost, .money),
                XLCell.number(asset.value, .money),
                XLCell.pnl(asset.pnl),
                XLCell.pnl(asset.pnlRate, percent: true),
                XLCell.number(totalValue == 0 ? 0 : asset.value / totalValue, .percent),
                XLCell.text(Fmt.optionalNumber(asset.units, digits: 4), .center),
                XLCell.text(Fmt.optionalNumber(asset.costPrice, digits: 4), .center),
                XLCell.text(Fmt.optionalNumber(asset.price, digits: 4), .center),
                XLCell.text(asset.note, .wrap),
                XLCell.text(asset.nextStep, .wrap),
                XLCell.text(asset.dataStatus, .center)
            ]
            rows.append(row)
            heights[rows.count] = 34
        }

        let totalRow = [
            XLCell.text("合计", .totalLabel),
            XLCell.blank(.totalLabel),
            XLCell.blank(.totalLabel),
            XLCell.blank(.totalLabel),
            XLCell.number(totalCost, .totalMoney),
            XLCell.number(totalValue, .totalMoney),
            XLCell.number(totalPnL, .totalMoney),
            XLCell.number(totalRate, .totalPercent),
            XLCell.number(1, .totalPercent),
            XLCell.blank(.totalLabel),
            XLCell.blank(.totalLabel),
            XLCell.blank(.totalLabel),
            XLCell.blank(.totalLabel),
            XLCell.blank(.totalLabel),
            XLCell.blank(.totalLabel)
        ]
        rows.append(totalRow)
        heights[rows.count] = 28

        let lastDataRow = max(3, rows.count - 1)
        return XLSheet(
            name: "当前持仓",
            columnWidths: widths,
            rows: rows,
            freezeRows: 3,
            autoFilter: "A3:O\(lastDataRow)",
            merges: merges,
            rowHeights: heights
        )
    }

    private static func tradesSheet(data: AppData) -> XLSheet {
        let headers = ["日期", "账户", "类别", "代码", "名称", "操作", "金额", "份额", "成交价/净值", "手续费", "已实现盈亏", "操作理由", "当时情绪", "市场 / 消息面", "结果复盘", "按计划？", "教训 / 下次"]
        let widths: [Double] = [12, 16, 12, 10, 24, 10, 13, 11, 13, 11, 13, 34, 12, 30, 30, 11, 30]
        var rows: [[XLCell]] = []
        var merges: [String] = ["A1:Q1", "A2:Q2"]
        var heights: [Int: Double] = [1: 34, 2: 22, 3: 32]

        rows.append([.text("操作记录", .title)] + Array(repeating: .blank(.title), count: 16))
        rows.append([.text("一行一笔；只记操作与当时的判断，不自动计入持仓。共 \(data.trades.count) 笔。", .subtitle)] + Array(repeating: .blank(.subtitle), count: 16))
        rows.append(headers.map { .text($0, .header) })

        let sorted = data.trades.sorted {
            if $0.date == $1.date { return $0.createdAt > $1.createdAt }
            return $0.date > $1.date
        }
        if sorted.isEmpty {
            merges.append("A4:Q4")
            rows.append([.text("暂无操作记录。可在“操作记录”页记录第一笔买入、卖出或定投。", .caption)] + Array(repeating: .blank(.caption), count: 16))
        } else {
            for trade in sorted {
                rows.append([
                    .text(trade.date, .center),
                    .text(trade.account, .textCell),
                    .text(trade.category, .center),
                    .text(trade.code, .center),
                    .text(trade.name, .textCell),
                    .text(trade.action, .center),
                    .text(trade.amount.map { Fmt.money($0) } ?? "—", .center),
                    .text(Fmt.optionalNumber(trade.shares, digits: 4), .center),
                    .text(Fmt.optionalNumber(trade.price, digits: 4), .center),
                    .text(trade.fee.map { Fmt.money($0) } ?? "—", .center),
                    .text(trade.realizedPnL.map { Fmt.money($0, signed: true) } ?? "—", .center),
                    .text(trade.reason, .wrap),
                    .text(trade.mood, .center),
                    .text(trade.market, .wrap),
                    .text(trade.review, .wrap),
                    .text(trade.followedPlan, .center),
                    .text(trade.lesson, .wrap)
                ])
                heights[rows.count] = 38
            }
        }

        return XLSheet(
            name: "操作记录",
            columnWidths: widths,
            rows: rows,
            freezeRows: 3,
            autoFilter: sorted.isEmpty ? nil : "A3:Q\(rows.count)",
            merges: merges,
            rowHeights: heights
        )
    }

    private static func reviewsSheet(data: AppData) -> XLSheet {
        let headers = ["日期", "心态", "情绪 / 触发", "今日操作", "市场观察", "做对的事", "做错的事 / 教训", "明日计划", "当日总资产"]
        let widths: [Double] = [12, 11, 26, 34, 30, 30, 30, 30, 14]
        var rows: [[XLCell]] = []
        var merges: [String] = ["A1:I1", "A2:I2"]
        var heights: [Int: Double] = [1: 34, 2: 22, 3: 30]

        rows.append([.text("每日复盘", .title)] + Array(repeating: .blank(.title), count: 8))
        rows.append([.text("先记事实，再记感受，最后写下一步。共 \(data.reviews.count) 条。", .subtitle)] + Array(repeating: .blank(.subtitle), count: 8))
        rows.append(headers.map { .text($0, .header) })

        let snapshotMap = Dictionary(uniqueKeysWithValues: data.snapshots.map { ($0.date, $0) })
        let sorted = data.reviews.sorted { $0.date > $1.date }
        if sorted.isEmpty {
            merges.append("A4:I4")
            rows.append([.text("暂无复盘记录。每天 3 分钟，先写下今天的事实和下一步。", .caption)] + Array(repeating: .blank(.caption), count: 8))
        } else {
            for review in sorted {
                let value = snapshotMap[review.date]?.value
                rows.append([
                    .text(review.date, .center),
                    .text("\(review.mood) · \(review.moodLabel)", .center),
                    .text(review.trigger, .wrap),
                    .text(review.operations, .wrap),
                    .text(review.market, .wrap),
                    .text(review.didRight, .wrap),
                    .text(review.didWrong, .wrap),
                    .text(review.nextPlan, .wrap),
                    .text(value.map { Fmt.money($0) } ?? "—", .center)
                ])
                heights[rows.count] = 48
            }
        }

        return XLSheet(
            name: "每日复盘",
            columnWidths: widths,
            rows: rows,
            freezeRows: 3,
            autoFilter: sorted.isEmpty ? nil : "A3:I\(rows.count)",
            merges: merges,
            rowHeights: heights
        )
    }

    private static func plansSheet(data: AppData) -> XLSheet {
        let headers = ["平台", "代码", "名称", "类别", "频率", "每期金额", "月均估算", "扣款日", "起始时间", "状态", "备注"]
        let widths: [Double] = [18, 10, 24, 12, 12, 12, 12, 12, 12, 12, 36]
        var rows: [[XLCell]] = []
        var merges: [String] = ["A1:K1", "A2:K2"]
        var heights: [Int: Double] = [1: 34, 2: 22, 3: 30]

        let active = data.plans.filter { $0.status == PlanStatus.active.rawValue }
        let monthly = active.reduce(0) { $0 + $1.monthlyEstimate }
        rows.append([.text("定投计划", .title)] + Array(repeating: .blank(.title), count: 10))
        rows.append([.text("进行中计划月均估算 \(Fmt.money(monthly)) 元　｜　每交易日按 21.75 天、每日按 30 天、每周按 52/12 周估算", .subtitle)] + Array(repeating: .blank(.subtitle), count: 10))
        rows.append(headers.map { .text($0, .header) })

        let sorted = data.plans.sorted {
            if $0.status == $1.status { return $0.name < $1.name }
            return $0.status == PlanStatus.active.rawValue
        }
        if sorted.isEmpty {
            merges.append("A4:K4")
            rows.append([.text("暂无定投计划。", .caption)] + Array(repeating: .blank(.caption), count: 10))
        } else {
            for plan in sorted {
                rows.append([
                    .text(plan.platform, .textCell),
                    .text(plan.code, .center),
                    .text(plan.name, .textCell),
                    .text(plan.category, .center),
                    .text(plan.frequency, .center),
                    .text(plan.amount.map { Fmt.money($0) } ?? "—", .center),
                    .text(plan.isCashPool ? "—" : Fmt.money(plan.monthlyEstimate), .center),
                    .text(plan.debitDay.isEmpty ? "—" : plan.debitDay, .center),
                    .text(plan.startDate.isEmpty ? "—" : plan.startDate, .center),
                    .text(plan.status, .center),
                    .text(plan.note, .wrap)
                ])
                heights[rows.count] = 32
            }
        }

        let noteRow = rows.count + 2
        merges.append("A\(noteRow):K\(noteRow)")
        rows.append(Array(repeating: .blank(), count: 11))
        rows.append([.text("资金归集计划不重复计入“月均定投”；基金当前市值统一在“当前持仓”中维护。", .caption)] + Array(repeating: .blank(.caption), count: 10))
        heights[noteRow] = 22

        return XLSheet(
            name: "定投计划",
            columnWidths: widths,
            rows: rows,
            freezeRows: 3,
            autoFilter: sorted.isEmpty ? nil : "A3:K\(rows.count - 2)",
            merges: merges,
            rowHeights: heights
        )
    }

    private static func snapshotsSheet(data: AppData) -> XLSheet {
        let headers = ["日期", "总投入", "总资产", "浮动盈亏", "现金"]
        let widths: [Double] = [14, 16, 16, 16, 16]
        var rows: [[XLCell]] = []
        var merges: [String] = ["A1:E1", "A2:E2"]
        let heights: [Int: Double] = [1: 34, 2: 22, 3: 28]

        rows.append([.text("净值快照", .title)] + Array(repeating: .blank(.title), count: 4))
        rows.append([.text("记录每天的总投入、总资产和现金；用于观察净值走势。", .subtitle)] + Array(repeating: .blank(.subtitle), count: 4))
        rows.append(headers.map { .text($0, .header) })

        let sorted = data.snapshots.sorted { $0.date < $1.date }
        if sorted.isEmpty {
            merges.append("A4:E4")
            rows.append([.text("暂无快照。更新持仓后会自动记录当天数据。", .caption)] + Array(repeating: .blank(.caption), count: 4))
        } else {
            for snapshot in sorted {
                rows.append([
                    .text(snapshot.date, .center),
                    .number(snapshot.cost, .money),
                    .number(snapshot.value, .money),
                    .pnl(snapshot.pnl),
                    .number(snapshot.cash, .money)
                ])
            }
        }

        return XLSheet(
            name: "净值快照",
            columnWidths: widths,
            rows: rows,
            freezeRows: 3,
            autoFilter: sorted.isEmpty ? nil : "A3:E\(rows.count)",
            merges: merges,
            rowHeights: heights
        )
    }

    private static func exportDateString() -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_CN")
        formatter.dateFormat = "yyyy-MM-dd HH:mm"
        return formatter.string(from: Date())
    }
}
