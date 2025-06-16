const PDFDocument = require("pdfkit")
const fs = require("fs")
const sizeOf = require("image-size").default

function generateQuotationPDF(data, outputPath) {
  const doc = new PDFDocument({ margin: 50 })
  doc.pipe(fs.createWriteStream(outputPath))

  const pageWidth = doc.page.width
  const margin = 50
  const usableWidth = pageWidth - 2 * margin

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
  doc.text(`Date: ${data.date}`, { align: "right" })

  let th = doc.y + 5

  doc.font("Helvetica-Bold")
  doc.text("Quotation No", { align: "left" }, th)
  doc.text("Expiry", { align: "center" }, th)
  doc.text("Salesperson", { align: "right" }, th)

  doc.font("Helvetica")
  doc.text(data.quotationNo, { align: "left" }, th + 10)
  doc.text(data.expiryDate, { align: "center" }, th + 10)
  doc.text(data.salesperson, { align: "right" }, th + 10)

  doc
    .moveDown()
    .fontSize(10)
    .text(
      `To,\n${data.recipientName}\n${data.recipientAddress}\nGSTIN: ${data.recipientGSTIN}`,
    )

  doc.moveDown()
  doc.text("We are pleased to quote our best prices for the following items:", {
    align: "left",
  })

  // Table Header
  const tableTop = doc.y + 20
  doc.font("Helvetica-Bold")
  doc.text("S.No", 50, tableTop)
  doc.text("Item Name", 90, tableTop)
  doc.text("HSN", 230, tableTop)
  doc.text("Qty", 270, tableTop)
  doc.text("Unit Price", 310, tableTop)
  doc.text("Disc.%", 380, tableTop)
  doc.text("Taxes", 430, tableTop)
  doc.text("Amount", 500, tableTop)

  doc.font("Helvetica")
  let y = tableTop + 15
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]
    doc.text(i + 1, 50, y)
    doc.text(item.name, 90, y, { width: 130 })
    doc.text(item.hsn, 230, y)
    doc.text(item.qty.toString(), 270, y)
    doc.text(`Rs. ${item.unitPrice.toFixed(2)}`, 310, y)
    doc.text(`${item.discount?.toFixed(2)}%`, 380, y)
    doc.text(`${item.tax}%`, 430, y)
    doc.text(`Rs. ${item.amount.toFixed(2)}`, 500, y)
    y += 20
  }

  doc.strokeColor("#00000").moveTo(50, y).lineTo(560, y).stroke()

  y += 10
  doc.text(`Untaxed Amount: Rs. ${data.untaxedAmount?.toFixed(2)}`, 360, y, {
    align: "right",
  })
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
  doc.text("Payment terms: Immediate Payment", 50, y)
  y += 20
  doc.text("Thank you,\nIndustech Automations,\nMadurai.", 50, y)

  doc.end()
}

module.exports = generateQuotationPDF
