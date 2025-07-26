const PDFDocument = require("pdfkit")
const fs = require("fs")
const sizeOf = require("image-size").default

/**
 * Generates a quotation PDF with improved footer placement logic.
 * @param {object} data - The data for the quotation.
 * @param {string} outputPath - The path to save the generated PDF.
 */
function generateQuotationPDF(data, outputPath) {
  return new Promise((resolve, reject) => {
    if (!data || !Array.isArray(data.items)) {
      return reject(new TypeError("The 'items' property must be an array."))
    }

    const doc = new PDFDocument({ size: "A4", margin: 25 })
    const stream = fs.createWriteStream(outputPath)
    doc.pipe(stream)

    function ensureSpace(heightNeeded) {
      const available = doc.page.height - doc.page.margins.bottom
      if (doc.y + heightNeeded > available) {
        console.log(
          `Adding page. y=${doc.y}, need=${heightNeeded}, limit=${available}`,
        )
        doc.addPage()
        doc.y = doc.page.margins.top
      }
    }

    const logoWidth = 65
    const buffer = fs.readFileSync("public/logob.png")
    const logoDims = sizeOf(buffer)
    const logoScale = logoWidth / logoDims.width
    const logoHeight = logoDims.height * logoScale

    doc.y = 25
    const headerLine = doc.y + logoHeight + 10
    doc.image("public/logob.png", { width: 65 })
    doc
      .strokeColor("#111a2e")
      .moveTo(25, headerLine + 7)
      .lineTo(585, headerLine + 7)
      .stroke()

    doc.y = 40
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("INDUSTECH AUTOMATIONS", { align: "right" })
    doc
      .fontSize(10)
      .font("Helvetica")
      .text("No 25b Kuruvikaran Salai", { align: "right" })
      .text("Madurai - 625009", { align: "right" })
      .text("Tamil Nadu", { align: "right" })
      .text("India", { align: "right" })
      .text("GSTIN: 33CHVPD3453N1ZW", { align: "right" })

    doc.y = headerLine + 13
    let th = doc.y + 5

    doc
      .font("Helvetica-Bold")
      .text("Quotation No", { align: "center" }, th)
      .text(`Date: ${data.date}`, { align: "right" }, th)

    doc.font("Helvetica").text(data.quotationNo, { align: "center" }, th + 10)

    doc.y = th
    doc
      .fontSize(10)
      .text(`To,\n${data.recipientName}\n${data.recipientAddress}`)
    doc.moveDown()
    doc.text("We are pleased to quote our best prices for the following items:")

    const tableTop = doc.y + 15
    doc.font("Helvetica-Bold")
    doc.text("S.No", 27, tableTop)
    doc.text("Material Description", 61, tableTop)
    doc.text("HSN", 330, tableTop)
    doc.text("Qty", 380, tableTop)
    doc.text("Unit Price", 430, tableTop, { width: 60, align: "right" })
    doc.text("Amount", 500, tableTop, { width: 80, align: "right" })
    doc
      .strokeColor("#000000")
      .moveTo(25, tableTop + 15)
      .lineTo(585, tableTop + 15)
      .stroke()

    doc.font("Helvetica")
    doc.y = tableTop + 25

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i]
      const rowHeight = doc.heightOfString(item.name, {
        width: 259,
      })

      console.log(`Item ${i + 1}: y=${doc.y}, rowHeight=${rowHeight}`)
      ensureSpace(rowHeight)

      const yStart = doc.y
      doc.text(`${i + 1}`, 29, yStart)
      doc.text(item.name, 61, yStart, { width: 259 })
      doc.text(item.hsn, 330, yStart)
      doc.text(item.qty.toString(), 380, yStart)
      doc.text(`Rs. ${item.unitPrice.toFixed(2)}`, 420, yStart, {
        width: 70,
        align: "right",
      })
      doc.text(`Rs. ${item.amount.toFixed(2)}`, 500, yStart, {
        width: 80,
        align: "right",
      })

      doc.y += rowHeight
      doc
        .strokeColor("#e0e0e0")
        .moveTo(25, doc.y - 8)
        .lineTo(585, doc.y - 8)
        .stroke()
    }

    doc.y += 10
    doc.text(
      `Untaxed Amount: Rs. ${data.untaxedAmount?.toFixed(2)}`,
      360,
      doc.y,
      { align: "right" },
    )
    doc.y += 5
    doc.text(
      `Installation charges: Rs. ${data.installationCharge?.toFixed(2)}`,
      360,
      doc.y,
      { align: "right" },
    )
    doc.y += 5
    doc.text(`SGST: Rs. ${data.sgst?.toFixed(2)}`, 360, doc.y, {
      align: "right",
    })
    doc.y += 5
    doc.text(`CGST: Rs. ${data.cgst?.toFixed(2)}`, 360, doc.y, {
      align: "right",
    })
    doc.y += 5
    doc.strokeColor("#000000").moveTo(450, doc.y).lineTo(560, doc.y).stroke()
    doc.y += 5
    doc
      .font("Helvetica-Bold")
      .text(`Total: Rs. ${data.total?.toFixed(2)}`, 360, doc.y, {
        align: "right",
      })
    doc.y += 5
    doc
      .font("Helvetica")
      .text(`In Words: ${data.totalInWords}`, 25, doc.y, { width: 510 })

    doc.y += 7
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("Terms and Conditions:", 25, doc.y)
    doc.y += 5
    doc.font("Helvetica")

    if (Array.isArray(data.terms)) {
      data.terms.forEach((term, idx) => {
        const termText = `${idx + 1}. ${term}`
        const termHeight = doc.heightOfString(termText, { width: 495 }) - 10
        console.log(`Term ${idx + 1}: y=${doc.y}, height=${termHeight}`)
        ensureSpace(termHeight)
        doc.text(termText, 50, doc.y, { width: 495 })
        doc.y += termHeight
      })
    }

    console.log("near end", doc.y)
    const thankYouText = "Thank you,\nIndustech Automations,\nMadurai."
    const contactLine = "Email: industechautomations@gmail.com"
    const thankYouHeight = doc.heightOfString(thankYouText, { width: 250 })
    console.log("thank", thankYouHeight)
    const contactHeight = doc.heightOfString(contactLine, { width: 510 })
    console.log("he", contactHeight)
    const totalFooterHeight = thankYouHeight + contactHeight + 10

    ensureSpace(totalFooterHeight)

    doc.y =
      doc.page.height -
      doc.page.margins.bottom -
      thankYouHeight -
      contactHeight -
      5
    console.log("ass", doc.y)
    doc.text(thankYouText, 25, doc.y)
    const contactLinePosition = doc.page.height - doc.page.margins.bottom - 12
    doc
      .font("Helvetica")
      .text(contactLine, 25, contactLinePosition, { width: 510, align: "left" })
    doc.text("Contact: 9500817178", 25, contactLinePosition, { align: "right" })
    console.log("end", doc.y)

    doc.end()

    stream.on("finish", () => {
      console.log("PDF generation complete.")
      resolve()
    })
    stream.on("error", (err) => reject(err))
  })
}

module.exports = generateQuotationPDF
