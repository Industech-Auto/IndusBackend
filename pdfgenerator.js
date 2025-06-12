const PDFDocument = require("pdfkit")
const fs = require("fs")

function generateQuotationPDF(data, outputPath) {
  const doc = new PDFDocument({ margin: 50 })

  doc.pipe(fs.createWriteStream(outputPath))

  // Header
  doc.fontSize(10).text(`Date: ${data.date}`, { align: "right" })

  doc
    .moveDown()
    .fontSize(12)
    .text(
      `To,\n${data.recipientName},\n${data.recipientLocation}\n\nDear Sir/Madam,`,
      { align: "left" },
    )

  doc
    .moveDown()
    .text(
      "With reference to your query, we are pleased to quote our best prices of the desired CCTV Security system.",
    )

  // Table Headers
  doc.moveDown().fontSize(10)
  const tableTop = doc.y
  const colWidths = { no: 40, desc: 200, qty: 60, unit: 80, amt: 80 }

  doc.text("Sl. No.", 50, tableTop)
  doc.text("Material Description", 90, tableTop)
  doc.text("Qty", 300, tableTop)
  doc.text("Unit Price", 360, tableTop)
  doc.text("Amount", 450, tableTop)

  doc.moveDown()

  // Table Rows
  let i = 1
  let y = doc.y + 5
  for (const item of data.items) {
    doc.text(i++, 50, y)
    doc.text(item.description, 90, y, { width: 200 })
    doc.text(item.qty.toString(), 300, y)
    doc.text(`Rs. ${item.unitPrice.toFixed(2)}`, 360, y)
    doc.text(`Rs. ${item.amount.toFixed(2)}`, 450, y)
    y += 20
  }

  doc.moveTo(50, y).lineTo(550, y).stroke()

  y += 10
  doc.text(`Total Supply: Rs. ${data.supplyTotal.toFixed(2)}`, 360, y)
  y += 15
  doc.text(`GST 18%: Rs. ${data.gstAmount.toFixed(2)}`, 360, y)
  y += 15
  doc.text(`Other Charges: Rs. ${data.otherCharges.toFixed(2)}`, 360, y)
  y += 15
  doc.text(`Total: Rs. ${data.finalTotal.toFixed(2)}`, 360, y)
  y += 15
  doc.text(`In Words: ${data.totalInWords}`, 50, y, { width: 500 })
  y += 15
  doc.text("Note: 50% of Advance should be paid before installation.", 50, y)

  // Footer
  y += 25
  doc.fontSize(10).text("Thank you,\nIndustech Automations,\nMadurai.", 50, y)

  doc.end()
}

module.exports = generateQuotationPDF
