/**
 * @module InvoiceGenerator
 * This module exports a function to generate a PDF invoice using pdfkit.
 * CHANGE LOG:
 * - Fixed a critical bug where tables with many items would overflow messily across
 * multiple pages. Both the main items table and the tax analysis table now correctly
 * handle page breaks, adding new pages and redrawing headers as needed.
 */
const PDFDocument = require("pdfkit")
const fs = require("fs")

function generateInvoicePDF(data, outputPath) {
  const doc = new PDFDocument({ size: "A4", margin: 30 })
  doc.pipe(fs.createWriteStream(outputPath))

  const calculatedData = calculateTotals(data)

  let y = doc.page.margins.top
  y = generateHeaderAndInvoiceDetails(doc, calculatedData, y)
  y = generateBuyerDetails(doc, calculatedData, y)
  y = generateInvoiceTable(doc, calculatedData, y)

  const endOfTableY = y
  const pageHeight = doc.page.height
  const pageMarginBottom = doc.page.margins.bottom

  // Estimate heights required for the footer sections
  const footerHeight = 180
  const taxAnalysisHeight = 160

  if (
    pageHeight - endOfTableY - pageMarginBottom >
    footerHeight + taxAnalysisHeight
  ) {
    y = generateFooter(doc, calculatedData, endOfTableY)
    generateTaxAnalysis(doc, calculatedData, y + 15)
  } else {
    generateFooter(doc, calculatedData, endOfTableY)
    doc.addPage()
    let newPageY = doc.page.margins.top
    generateContinuationHeader(doc, calculatedData, newPageY)
    generateTaxAnalysis(doc, calculatedData, newPageY + 30)
  }

  doc.end()
}

function calculateTotals(data) {
  if (!data || !data.invoice || !Array.isArray(data.invoice.items)) {
    throw new Error(
      "Invalid invoice data: 'data.invoice.items' must be an array.",
    )
  }

  if (data.invoice.installation && data.invoice.installation.amount > 0) {
    const installationItem = {
      name: "Installation & Commissioning Charges",
      hsn: data.invoice.installation.hsn || "998739",
      qty: 1,
      unitPrice: data.invoice.installation.amount,
      taxRate: data.invoice.installation.taxRate || 18,
      discount: 0,
    }
    const alreadyExists = data.invoice.items.some(
      (item) => item.name === installationItem.name,
    )
    if (!alreadyExists) {
      data.invoice.items.push(installationItem)
    }
  }

  let subtotal = 0
  const hsnGroups = {}

  data.invoice.items.forEach((item) => {
    const itemTotal = item.qty * item.unitPrice
    const discountAmount = (itemTotal * (item.discount || 0)) / 100
    const taxableAmount = itemTotal - discountAmount

    item.amount = taxableAmount
    subtotal += taxableAmount

    if (!hsnGroups[item.hsn]) {
      hsnGroups[item.hsn] = {
        hsn: item.hsn,
        taxableValue: 0,
        taxRate: item.taxRate,
      }
    }
    hsnGroups[item.hsn].taxableValue += taxableAmount
  })

  let totalTax = 0
  let totalCgst = 0
  let totalSgst = 0

  for (const hsn in hsnGroups) {
    const group = hsnGroups[hsn]
    const taxRate = group.taxRate || 0
    const groupTax = group.taxableValue * (taxRate / 100)
    const cgst = groupTax / 2
    const sgst = groupTax / 2

    group.cgstAmount = cgst
    group.sgstAmount = sgst
    group.totalTax = groupTax
    totalCgst += cgst
    totalSgst += sgst
    totalTax += groupTax
  }

  const grandTotal = subtotal + totalTax

  return {
    ...data,
    calculated: {
      subtotal,
      totalCgst,
      totalSgst,
      totalTax,
      grandTotal,
      hsnGroups: Object.values(hsnGroups),
      grandTotalInWords: toWords(grandTotal),
      taxAmountInWords: toWords(totalTax),
    },
  }
}

function generateHeaderAndInvoiceDetails(doc, data, y) {
  const { company, invoice } = data
  const margin = doc.page.margins.left
  const rightBound = doc.page.width - doc.page.margins.right
  const boxWidth = rightBound - margin
  const boxHeight = 90

  doc.rect(margin, y, boxWidth, boxHeight).stroke()
  doc
    .moveTo(margin + boxWidth / 2, y)
    .lineTo(margin + boxWidth / 2, y + boxHeight)
    .stroke()

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("Tax Invoice", margin, y - 20, { align: "center" })

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(company.name, margin + 5, y + 5)
  doc.font("Helvetica").fontSize(9)
  doc.text(company.address, margin + 5, y + 22)
  doc.text(`${company.city}, ${company.state}`, margin + 5, y + 35)
  doc.text(`GSTIN: ${company.gstin}`, margin + 5, y + 50)
  doc.text(`e-Mail: ${company.email}`, margin + 5, y + 65)

  const rightColX = margin + boxWidth / 2 + 10
  const rightColWidth = boxWidth / 2 - 20
  doc.font("Helvetica-Bold").fontSize(9)
  doc.text("Invoice No:", rightColX, y + 5)
  doc
    .font("Helvetica")
    .text(invoice.number, rightColX, y + 5, {
      align: "right",
      width: rightColWidth,
    })

  doc.font("Helvetica-Bold").text("Dated:", rightColX, y + 20)
  doc
    .font("Helvetica")
    .text(
      new Date(invoice.date).toLocaleDateString("en-GB"),
      rightColX,
      y + 20,
      { align: "right", width: rightColWidth },
    )

  return y + boxHeight
}

function generateBuyerDetails(doc, data, y) {
  const { customer } = data
  const margin = doc.page.margins.left
  const rightBound = doc.page.width - doc.page.margins.right
  const boxWidth = rightBound - margin

  doc.fontSize(9)
  const addressHeight = doc.heightOfString(customer.address, {
    width: boxWidth - 55,
  })
  const boxHeight = addressHeight + (customer.gstin ? 45 : 30)

  doc.rect(margin, y, boxWidth, boxHeight).stroke()

  doc.font("Helvetica-Bold").text("Buyer:", margin + 5, y + 5)
  doc
    .font("Helvetica")
    .text(customer.name, margin + 50, y + 5, { width: boxWidth - 55 })
  doc.text(customer.address, margin + 50, y + 20, { width: boxWidth - 55 })
  if (customer.gstin) {
    doc.text(
      `GSTIN: ${customer.gstin}`,
      margin + 50,
      y + 20 + addressHeight + 5,
    )
  }

  return y + boxHeight
}

function generateContinuationHeader(doc, data, y) {
  const { company, invoice } = data
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(company.name, doc.page.margins.left, y)
  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .text("Tax Invoice (Continuation)", 0, y, { align: "center" })
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`Invoice No: ${invoice.number}`, 0, y + 20, { align: "right" })
  y += 45
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .stroke()
  return y + 10
}

function drawItemsTableHeader(doc, y) {
  const margin = doc.page.margins.left
  const rightBound = doc.page.width - doc.page.margins.right
  const tableWidth = rightBound - margin

  const headers = [
    "Sl.No",
    "Description",
    "HSN/SAC",
    "Qty",
    "Rate",
    "Unit",
    "Disc %",
    "Amount",
  ]
  const colWidths = [30, 210, 60, 30, 60, 40, 40, 60]

  doc.rect(margin, y, tableWidth, 20).stroke()
  let currentX = margin
  doc.font("Helvetica-Bold").fontSize(9)
  headers.forEach((header, i) => {
    doc.text(header, currentX + 2, y + 6, {
      width: colWidths[i] - 4,
      align: "center",
    })
    currentX += colWidths[i]
  })
  return y + 20
}

function generateInvoiceTable(doc, data, y) {
  const { invoice } = data
  const margin = doc.page.margins.left
  const pageBottom = doc.page.height - doc.page.margins.bottom
  const colWidths = [30, 210, 60, 30, 60, 40, 40, 60]

  y = drawItemsTableHeader(doc, y)

  doc.font("Helvetica").fontSize(9)
  invoice.items.forEach((item, index) => {
    const rowData = [
      index + 1,
      item.name,
      item.hsn,
      item.qty,
      item.unitPrice.toFixed(2),
      "nos",
      (item.discount || 0).toFixed(2),
      item.amount.toFixed(2),
    ]
    const rowHeight =
      doc.heightOfString(item.name, { width: colWidths[1] - 4 }) + 8

    // *** PAGE BREAK LOGIC ***
    if (y + rowHeight > pageBottom) {
      doc.addPage()
      y = doc.page.margins.top
      y = generateContinuationHeader(doc, data, y)
      y = drawItemsTableHeader(doc, y)
    }

    doc.rect(margin, y, doc.page.width - margin * 2, rowHeight).stroke()
    let currentX = margin
    rowData.forEach((cell, i) => {
      doc.text(cell, currentX + 2, y + 4, {
        width: colWidths[i] - 4,
        align: "center",
      })
      currentX += colWidths[i]
    })
    y += rowHeight
  })

  return y
}

function generateFooter(doc, data, y) {
  const { company, calculated } = data
  const margin = doc.page.margins.left
  const rightBound = doc.page.width - doc.page.margins.right

  // Totals Box
  const totalsHeight = 80
  doc.rect(margin, y, rightBound - margin, totalsHeight).stroke()
  const totalsRightColX = rightBound - 200

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("Sub Total", totalsRightColX, y + 5)
  doc
    .font("Helvetica")
    .text(calculated.subtotal.toFixed(2), totalsRightColX + 100, y + 5, {
      align: "right",
      width: 90,
    })

  doc.font("Helvetica-Bold").text("CGST", totalsRightColX, y + 20)
  doc
    .font("Helvetica")
    .text(calculated.totalCgst.toFixed(2), totalsRightColX + 100, y + 20, {
      align: "right",
      width: 90,
    })

  doc.font("Helvetica-Bold").text("SGST", totalsRightColX, y + 35)
  doc
    .font("Helvetica")
    .text(calculated.totalSgst.toFixed(2), totalsRightColX + 100, y + 35, {
      align: "right",
      width: 90,
    })

  doc.font("Helvetica-Bold").text("Total", totalsRightColX, y + 55)
  doc
    .font("Helvetica")
    .text(calculated.grandTotal.toFixed(2), totalsRightColX + 100, y + 55, {
      align: "right",
      width: 90,
    })

  doc
    .font("Helvetica-Bold")
    .text("Chargeable Amount (In Words):", margin + 5, y + 5)
  doc
    .font("Helvetica")
    .text(calculated.grandTotalInWords, margin + 5, y + 20, { width: 300 })

  y += totalsHeight

  // Combined Declaration, Bank Details, and Signature Box
  const bottomHeight = 90
  const boxWidth = rightBound - margin
  doc.rect(margin, y, boxWidth, bottomHeight).stroke()

  const midPointX = margin + boxWidth / 2
  doc
    .moveTo(midPointX, y)
    .lineTo(midPointX, y + bottomHeight)
    .stroke()

  const col1X = margin + 5
  const col1Width = boxWidth / 2 - 10
  doc
    .font("Helvetica-Bold")
    .text("Declaration:", col1X, y + 5, { align: "center", width: col1Width })
  doc
    .font("Helvetica")
    .text(data.invoice.declaration, col1X, y + 18, {
      width: col1Width,
      align: "center",
    })

  const col2X = midPointX + 5
  const col2Width = boxWidth / 2 - 10
  const horizontalLineY = y + bottomHeight / 2 + 10
  doc
    .moveTo(midPointX, horizontalLineY)
    .lineTo(rightBound, horizontalLineY)
    .stroke()

  doc.font("Helvetica-Bold").text("Company Bank Details:", col2X, y + 5)
  doc
    .font("Helvetica")
    .text(`Bank Name: ${company.bankDetails.bankName}`, col2X, y + 18)
  doc.text(`Account No: ${company.bankDetails.accountNo}`, col2X, y + 31)

  const signatureY = horizontalLineY + 5
  doc
    .font("Helvetica-Bold")
    .text(`For ${company.name}`, col2X, signatureY, {
      align: "right",
      width: col2Width,
    })
  doc.text("Authorized Signature", col2X, signatureY + 20, {
    align: "right",
    width: col2Width,
  })

  return y + bottomHeight
}

function generateTaxAnalysis(doc, data, y) {
  const { calculated } = data
  const margin = doc.page.margins.left
  const rightBound = doc.page.width - doc.page.margins.right
  const tableWidth = rightBound - margin

  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("(Tax Analysis)", 0, y - 15, { align: "center" })

  const headers = [
    "HSN/SAC",
    "Taxable Value",
    "Central Tax",
    "State Tax",
    "Total Tax",
  ]
  const subHeaders = ["Rate", "Amount", "Rate", "Amount"]
  const colWidths = [100, 100, 50, 60, 50, 60, 110]

  const headerY = y
  doc.rect(margin, headerY, tableWidth, 35).stroke()
  let currentX = margin
  doc.font("Helvetica-Bold").fontSize(9)
  doc.text(headers[0], currentX, headerY + 12, {
    width: colWidths[0],
    align: "center",
  })
  currentX += colWidths[0]
  doc.text(headers[1], currentX, headerY + 12, {
    width: colWidths[1],
    align: "center",
  })
  currentX += colWidths[1]
  const headersStartX = currentX
  doc.text(headers[2], headersStartX, headerY + 5, {
    width: colWidths[2] + colWidths[3],
    align: "center",
  })
  doc.text(
    headers[3],
    headersStartX + colWidths[2] + colWidths[3],
    headerY + 5,
    { width: colWidths[4] + colWidths[5], align: "center" },
  )
  currentX += colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5]
  doc.text(headers[4], currentX, headerY + 12, {
    width: colWidths[6],
    align: "center",
  })
  currentX = headersStartX
  doc.font("Helvetica-Bold").fontSize(8)
  subHeaders.forEach((subHeader, i) => {
    doc.text(subHeader, currentX, headerY + 18, {
      width: colWidths[i + 2],
      align: "center",
    })
    currentX += colWidths[i + 2]
  })

  y += 35

  calculated.hsnGroups.forEach((group) => {
    const rowData = [
      group.hsn,
      group.taxableValue.toFixed(2),
      `${(group.taxRate / 2).toFixed(2)}%`,
      group.cgstAmount.toFixed(2),
      `${(group.taxRate / 2).toFixed(2)}%`,
      group.sgstAmount.toFixed(2),
      group.totalTax.toFixed(2),
    ]
    const rowHeight = 20
    const rowY = y
    doc.rect(margin, rowY, tableWidth, rowHeight).stroke()
    let cellX = margin
    rowData.forEach((cell, i) => {
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(cell, cellX, rowY + 6, { width: colWidths[i], align: "center" })
      cellX += colWidths[i]
    })
    y += rowHeight
  })

  const totals = [
    "Total",
    calculated.subtotal.toFixed(2),
    "",
    calculated.totalCgst.toFixed(2),
    "",
    calculated.totalSgst.toFixed(2),
    calculated.totalTax.toFixed(2),
  ]
  const totalRowHeight = 20
  const totalRowY = y
  doc.rect(margin, totalRowY, tableWidth, totalRowHeight).stroke()
  let totalX = margin
  doc.font("Helvetica-Bold")
  totals.forEach((cell, i) => {
    doc.text(cell, totalX, totalRowY + 6, {
      width: colWidths[i],
      align: "center",
    })
    totalX += colWidths[i]
  })
  y += totalRowHeight + 10

  doc.font("Helvetica-Bold").text("Tax Amount (in words):", margin, y)
  doc.font("Helvetica").text(calculated.taxAmountInWords, margin, y + 12)
}

function toWords(num) {
  if (num === null || num === undefined) return ""
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ]
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ]

  function inWords(n) {
    let str = ""
    if (n >= 10000000) {
      str += inWords(Math.floor(n / 10000000)) + "Crore "
      n %= 10000000
    }
    if (n >= 100000) {
      str += inWords(Math.floor(n / 100000)) + "Lakh "
      n %= 100000
    }
    if (n >= 1000) {
      str += inWords(Math.floor(n / 1000)) + "Thousand "
      n %= 1000
    }
    if (n >= 100) {
      str += inWords(Math.floor(n / 100)) + "Hundred "
      n %= 100
    }
    if (n > 0) {
      if (str !== "") str += "and "
      if (n < 20) str += a[n] + " "
      else str += b[Math.floor(n / 10)] + " " + a[n % 10] + " "
    }
    return str
  }

  let numStr = num.toFixed(2)
  let [integerPart, decimalPart] = numStr.split(".").map(Number)
  let words = `Rupees ${inWords(integerPart) || "Zero "}`
  if (decimalPart > 0) {
    words += `and ${inWords(decimalPart)}Paise `
  }
  return words.replace(/\s+/g, " ").trim() + "only"
}

module.exports = generateInvoicePDF
