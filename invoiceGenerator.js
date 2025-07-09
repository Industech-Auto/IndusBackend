const PDFDocument = require("pdfkit")

const fs = require("fs")

function generateInvoicePDF(data, outputPath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 30 })

    const stream = fs.createWriteStream(outputPath)

    doc.pipe(stream)

    const calculatedData = calculateTotals(data)

    // --- Draw First Page Content ---
    let y = doc.page.margins.top
    y = generateHeaderAndInvoiceDetails(doc, calculatedData, y)
    y = generateBuyerDetails(doc, calculatedData, y)
    y = generateInvoiceTable(doc, calculatedData, y)

    const pageBottom = doc.page.height - doc.page.margins.bottom

    // --- REVISED PLACEMENT LOGIC WITH A SAFETY BUFFER ---

    // Define the actual heights of the sections
    const footerActualHeight = 200 // (Totals box: 80 + Bottom box: 120)
    const taxAnalysisHeight =
      40 + (calculatedData.calculated.hsnGroups.length + 2) * 20
    const SAFETY_BUFFER = 40 // This is the key change to prevent edge cases

    // 1. Check if the footer can fit on the current page.
    // If not, create a new page for it.
    if (y + footerActualHeight > pageBottom) {
      doc.addPage()
      y = doc.page.margins.top
      y = generateContinuationHeader(doc, data, y)
    }
    // Draw the footer.
    y = generateFooter(doc, calculatedData, y)

    // 2. Check if the tax analysis section can fit below the footer.
    // We subtract the SAFETY_BUFFER from pageBottom to trigger the page break earlier.
    if (y + taxAnalysisHeight > pageBottom - SAFETY_BUFFER) {
      doc.addPage()
      y = doc.page.margins.top
      y = generateContinuationHeader(doc, data, y, true)
    }
    // Draw the tax analysis section.
    const finalY = generateTaxAnalysis(doc, calculatedData, y + 15)

    doc
      .font("Helvetica-Oblique")
      .fontSize(9)
      .text(
        "This is a computer generated invoice",
        doc.page.margins.left,
        finalY, // Use the final Y position
        {
          align: "center",
          width: doc.page.width - doc.page.margins.left * 2,
        },
      )

    doc.end()
    stream.on("finish", () => resolve())
    stream.on("error", reject)
  })
}

function calculateTotals(data) {
  if (!data || !data.invoice || !Array.isArray(data.invoice.items)) {
    throw new Error(
      "Invalid invoice data: 'data.invoice.items' must be an array.",
    )
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

function generateContinuationHeader(doc, data, y, isTaxPage = false) {
  const { company, invoice } = data

  const title = isTaxPage
    ? "Tax Invoice (Tax Analysis)"
    : "Tax Invoice (Continuation)"

  doc

    .font("Helvetica-Bold")

    .fontSize(11)

    .text(company.name, doc.page.margins.left, y)

  doc.font("Helvetica-Bold").fontSize(14).text(title, 0, y, { align: "center" })

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

  const tableWidth = doc.page.width - margin * 2 // Corrected column widths to sum up to the table width

  const colWidths = [30, 215, 60, 30, 60, 40, 40, 60]

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

  doc.rect(margin, y, tableWidth, 20).stroke()

  let currentX = margin

  doc.font("Helvetica-Bold").fontSize(9)

  headers.forEach((header, i) => {
    doc.text(header, currentX + 2, y + 6, {
      width: colWidths[i] - 4,

      align: "center",
    }) // Draw vertical lines

    if (i < headers.length) {
      doc

        .moveTo(currentX, y)

        .lineTo(currentX, y + 20)

        .stroke()
    }

    currentX += colWidths[i]
  }) // Final vertical line

  doc

    .moveTo(currentX, y)

    .lineTo(currentX, y + 20)

    .stroke()

  return y + 20
}

function generateInvoiceTable(doc, data, y) {
  const { invoice } = data

  const margin = doc.page.margins.left

  const pageBottom = doc.page.height - doc.page.margins.bottom // Corrected column widths to sum up to the table width

  const colWidths = [30, 215, 60, 30, 60, 40, 40, 60]

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

    if (y + rowHeight > pageBottom) {
      doc.addPage()

      y = doc.page.margins.top

      y = generateContinuationHeader(doc, data, y)

      y = drawItemsTableHeader(doc, y)
    }

    let currentX = margin // Draw horizontal line

    doc

      .moveTo(margin, y + rowHeight)

      .lineTo(margin + doc.page.width - margin * 2, y + rowHeight)

      .stroke()

    rowData.forEach((cell, i) => {
      doc.text(cell, currentX + 2, y + 4, {
        width: colWidths[i] - 4,

        align: "center",
      }) // Draw vertical lines

      if (i < rowData.length) {
        doc

          .moveTo(currentX, y)

          .lineTo(currentX, y + rowHeight)

          .stroke()
      }

      currentX += colWidths[i]
    }) // Final vertical line

    doc

      .moveTo(currentX, y)

      .lineTo(currentX, y + rowHeight)

      .stroke()

    y += rowHeight
  })

  return y
}

function generateFooter(doc, data, y) {
  const sealImagePath = "public/ita-zeal.png"
  const { company, calculated } = data
  const margin = doc.page.margins.left
  const rightBound = doc.page.width - doc.page.margins.right
  const totalsHeight = 80

  doc.rect(margin, y, rightBound - margin, totalsHeight).stroke()

  const totalsRightColX = rightBound - 200
  doc
    .moveTo(totalsRightColX, y)
    .lineTo(totalsRightColX, y + totalsHeight)
    .stroke()

  // --- Totals Box Content (as before) ---
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("Chargeable Amount (In Words):", margin + 5, y + 5)
  doc.font("Helvetica").text(calculated.grandTotalInWords, margin + 5, y + 20, {
    width: totalsRightColX - margin - 10,
  })
  doc.font("Helvetica-Bold").text("Sub Total", totalsRightColX + 5, y + 5)
  doc
    .font("Helvetica")
    .text(calculated.subtotal.toFixed(2), totalsRightColX + 100, y + 5, {
      align: "right",
      width: 90,
    })
  doc.font("Helvetica-Bold").text("CGST", totalsRightColX + 5, y + 20)
  doc
    .font("Helvetica")
    .text(calculated.totalCgst.toFixed(2), totalsRightColX + 100, y + 20, {
      align: "right",
      width: 90,
    })
  doc.font("Helvetica-Bold").text("SGST", totalsRightColX + 5, y + 35)
  doc
    .font("Helvetica")
    .text(calculated.totalSgst.toFixed(2), totalsRightColX + 100, y + 35, {
      align: "right",
      width: 90,
    })
  doc.font("Helvetica-Bold").text("Installation", totalsRightColX + 5, y + 45)
  doc.font("Helvetica").text(data.Installation, totalsRightColX + 100, y + 45, {
    align: "right",
    width: 90,
  })
  doc.font("Helvetica-Bold").text("Total", totalsRightColX + 5, y + 55)
  doc
    .font("Helvetica")
    .text(calculated.grandTotal.toFixed(2), totalsRightColX + 100, y + 55, {
      align: "right",
      width: 90,
    })

  y += totalsHeight

  // --- Bottom Box ---
  const bottomHeight = 120
  const boxWidth = rightBound - margin
  doc.rect(margin, y, boxWidth, bottomHeight).stroke()

  const midPointX = margin + boxWidth / 2
  doc
    .moveTo(midPointX, y)
    .lineTo(midPointX, y + bottomHeight)
    .stroke()

  // Declaration (Bottom-Left)
  const col1X = margin + 5
  const col1Width = boxWidth / 2 - 10
  doc
    .font("Helvetica-Bold")
    .text("Declaration:", col1X, y + 5, { align: "center", width: col1Width })
  doc.font("Helvetica").text(data.invoice.declaration, col1X, y + 18, {
    width: col1Width,
    align: "center",
  })

  // Bank & Signature Area (Bottom-Right)
  const col2X = midPointX + 5
  const col2Width = boxWidth / 2 - 10
  const horizontalLineY = y + 45 // Raised the line to create more space for the signature block

  doc
    .moveTo(midPointX, horizontalLineY)
    .lineTo(rightBound, horizontalLineY)
    .stroke()

  // Bank Details (Above the line)
  doc.font("Helvetica-Bold").text("Company Bank Details:", col2X, y + 5)
  doc
    .font("Helvetica")
    .text(`Bank Name: ${company.bankDetails.bankName}`, col2X, y + 18)
  doc.text(`Account No: ${company.bankDetails.accountNo}`, col2X, y + 31)

  // --- NEW SIGNATURE BLOCK LAYOUT (Below the line) ---
  let currentY = horizontalLineY + 8
  const rightAlignOpts = { align: "right", width: col2Width - 5 }

  // 1. "For Company Name"
  doc
    .font("Helvetica-Bold")
    .text(`For ${company.name}`, col2X, currentY, rightAlignOpts)
  currentY += 5 // Add space

  // 2. Seal Image
  if (sealImagePath) {
    const sealSize = 80
    const sealX = col2X + col2Width - sealSize - 5 // Align to the right
    doc.image(sealImagePath, sealX, currentY, { width: sealSize })
    currentY += sealSize - 25 // Move Y down by the height of the seal
  } else {
    currentY += 40 // If no seal, still reserve space
  }

  // 3. "Authorized Signature"
  doc
    .font("Helvetica-Bold")
    .text("Authorized Signature", col2X, currentY - 10, rightAlignOpts)

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

    .text("(Tax Analysis)", 0, y, { align: "center" })

  y += 25

  const headers = [
    "HSN/SAC",

    "Taxable Value",

    "Central Tax",

    "State Tax",

    "Total Tax",
  ]

  const subHeaders = ["Rate", "Amount", "Rate", "Amount"] // Corrected column widths to sum up to the table width

  const colWidths = [100, 105, 50, 60, 50, 60, 110] // --- Draw Header ---

  const headerY = y

  const headerHeight = 35

  doc.rect(margin, headerY, tableWidth, headerHeight).stroke()

  let currentX = margin // Draw the main vertical column dividers

  doc

    .moveTo(currentX, headerY)

    .lineTo(currentX, headerY + headerHeight)

    .stroke() // Left Edge

  currentX += colWidths[0] // After HSN

  doc

    .moveTo(currentX, headerY)

    .lineTo(currentX, headerY + headerHeight)

    .stroke()

  currentX += colWidths[1] // After Taxable Value

  doc

    .moveTo(currentX, headerY)

    .lineTo(currentX, headerY + headerHeight)

    .stroke()

  const subHeaderStartX = currentX

  currentX += colWidths[2] + colWidths[3] // After Central Tax

  doc

    .moveTo(currentX, headerY)

    .lineTo(currentX, headerY + headerHeight)

    .stroke()

  currentX += colWidths[4] + colWidths[5] // After State Tax

  doc

    .moveTo(currentX, headerY)

    .lineTo(currentX, headerY + headerHeight)

    .stroke()

  currentX += colWidths[6] // After Total Tax

  doc

    .moveTo(currentX, headerY)

    .lineTo(currentX, headerY + headerHeight)

    .stroke() // Right Edge
  // Draw the smaller vertical lines for sub-headers

  const subHeaderLineY = headerY + 17.5

  doc

    .moveTo(subHeaderStartX + colWidths[2], subHeaderLineY)

    .lineTo(subHeaderStartX + colWidths[2], headerY + headerHeight)

    .stroke()

  doc

    .moveTo(
      subHeaderStartX + colWidths[2] + colWidths[3] + colWidths[4],

      subHeaderLineY,
    )

    .lineTo(
      subHeaderStartX + colWidths[2] + colWidths[3] + colWidths[4],

      headerY + headerHeight,
    )

    .stroke() // Draw horizontal line for sub-headers

  doc

    .moveTo(subHeaderStartX, subHeaderLineY)

    .lineTo(
      subHeaderStartX +
        colWidths[2] +
        colWidths[3] +
        colWidths[4] +
        colWidths[5],

      subHeaderLineY,
    )

    .stroke() // --- Place Header Text ---

  currentX = margin

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

  y += 35 // --- Draw Rows ---

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

    doc.rect(margin, y, tableWidth, rowHeight).stroke()

    let cellX = margin

    rowData.forEach((cell, i) => {
      doc

        .font("Helvetica")

        .fontSize(9)

        .text(cell, cellX, y + 6, { width: colWidths[i], align: "center" })

      if (i < rowData.length)
        doc

          .moveTo(cellX, y)

          .lineTo(cellX, y + rowHeight)

          .stroke()

      cellX += colWidths[i]
    })

    doc

      .moveTo(cellX, y)

      .lineTo(cellX, y + rowHeight)

      .stroke()

    y += rowHeight
  }) // --- Draw Total Row ---

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

  doc.rect(margin, y, tableWidth, totalRowHeight).stroke()

  let totalX = margin

  doc.font("Helvetica-Bold")

  totals.forEach((cell, i) => {
    doc.text(cell, totalX, y + 6, { width: colWidths[i], align: "center" })

    if (i < totals.length)
      doc

        .moveTo(totalX, y)

        .lineTo(totalX, y + totalRowHeight)

        .stroke()

    totalX += colWidths[i]
  })

  doc

    .moveTo(totalX, y)

    .lineTo(totalX, y + totalRowHeight)

    .stroke()

  y += totalRowHeight + 10

  doc.font("Helvetica-Bold").text("Tax Amount (in words):", margin, y)

  doc.font("Helvetica").text(calculated.taxAmountInWords, margin, y + 12)

  return (y = 25)
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
