const PDFDocument = require("pdfkit")
const fs = require("fs")
const sizeOf = require("image-size").default

function generateQuotationPDF(data, outputPath) {
  const doc = new PDFDocument({ margin: 50 })
  doc.pipe(fs.createWriteStream(outputPath))

  // Load original image dimensions
  const logoWidth = 65
  const buffer = fs.readFileSync("public/logob.png")
  const logoDims = sizeOf(buffer)
  const logoScale = logoWidth / logoDims.width
  const logoHeight = logoDims.height * logoScale

  // logo
  doc.y = 50
  const headerLine = doc.y + logoHeight + 10
  doc.image("public/logob.png", { width: 65 })
  doc
    .strokeColor("#111a2e")
    .moveTo(50, headerLine + 7)
    .lineTo(560, headerLine + 7)
    .stroke()

  // Header
  doc.y = 65
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text("INDUSTECH AUTOMATIONS", { align: "right" })
  doc
    .fontSize(10)
    .font("Helvetica")
    .text("No 25b Kuruvikaran Salai", { align: "right" })
  doc.text("Madurai - 625009", { align: "right" })
  doc.text("Tamil Nadu", { align: "right" })
  doc.text("India", { align: "right" })
  doc.text("GSTIN: 33CHVPD3453N1ZW", { align: "right" })

  //Main body//////////////////////////////////////////
  doc.y = headerLine + 13

  let th = doc.y + 5

  doc.font("Helvetica-Bold")
  doc.text("Quotation No", { align: "center" }, th)
  doc.text(`Date: ${data.date}`, { align: "right" }, th)

  doc.font("Helvetica")
  doc.text(data.quotationNo, { align: "center" }, th + 10)

  doc.y = th
  doc.fontSize(10).text(`To,\n${data.recipientName}\n${data.recipientAddress}`)

  doc.moveDown()
  doc.text("We are pleased to quote our best prices for the following items:", {
    align: "left",
  })

  // Table Header
  const rectTop = doc.y + 12
  const tableTop = rectTop + 10
  doc.font("Helvetica-Bold")
  doc.text("S.No", 52, tableTop)
  doc.text("Material Description", 90, tableTop)
  doc.text("HSN", 270, tableTop)
  doc.text("Qty", 330, tableTop)
  doc.text("Unit Price", 410, tableTop)
  doc.text("Amount", 500, tableTop)
  doc
    .strokeColor("#000000")
    .strokeOpacity(30)
    .moveTo(50, tableTop + 15)
    .lineTo(560, tableTop + 15)
    .stroke()

  doc.font("Helvetica")
  let y = tableTop + 20
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]
    doc.text(`${i + 1}`, 54, y)
    doc.text(item.name, 90, y, { width: 130 })
    doc.text(item.hsn, 270, y)
    doc.text(item.qty.toString(), 330, y)
    doc.text(`Rs. ${item.unitPrice.toFixed(2)}`, 410, y)
    doc.text(`Rs. ${item.amount.toFixed(2)}`, 500, y)
    y += 20
  }

  const rectHeight = y - rectTop // Height from top of header to bottom of table
  doc.save() // Save current graphic state
  doc.fillColor("#313131").opacity(0.1)
  doc.rect(50, rectTop, 510, rectHeight).fill()
  doc.restore() // Restore opacity and fill color

  // Now draw final bottom line
  doc.strokeColor("#000000").moveTo(50, y).lineTo(560, y).stroke()

  y += 10
  doc.text(`Untaxed Amount: Rs. ${data.untaxedAmount?.toFixed(2)}`, 360, y, {
    align: "right",
  })
  y += 15
  doc.text(
    `Installation charges: Rs. ${data.installationCharge?.toFixed(2)}`,
    360,
    y,
    { align: "right" },
  )
  y += 15
  doc.text(`SGST: Rs. ${data.sgst?.toFixed(2)}`, 360, y, { align: "right" })
  y += 15
  doc.text(`CGST: Rs. ${data.cgst?.toFixed(2)}`, 360, y, { align: "right" })
  y += 15
  doc
    .font("Helvetica-Bold")
    .text(`Total: Rs. ${data.total?.toFixed(2)}`, 360, y, { align: "right" })
  y += 20

  doc.font("Helvetica")
  doc.text(`In Words: ${data.totalInWords}`, 50, y)

  // Terms and Conditions
  y += 30
  doc.fontSize(10).font("Helvetica-Bold").text("Terms and Conditions:", 50, y)
  doc.font("Helvetica")
  data.terms?.forEach((term, idx) => {
    y += 15
    doc.text(`${idx + 1}. ${term}`, 50, y, { width: 500 })
  })

  // Footer
  y += 30
  doc.text("Thank you,\nIndustech Automations,\nMadurai.", 50, y)
  y = doc.page.height - doc.page.margins.bottom - 20
  doc.text("Email: industech@gmail.com", 50, y)
  doc.text("Contact: 1234567890", { align: "right" }, y)
  doc.end()
}

module.exports = generateQuotationPDF
