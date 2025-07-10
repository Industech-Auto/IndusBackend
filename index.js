require("dotenv").config()
const express = require("express")
const quotationGenerator = require("./quotationGenerator")
const invoiceGenerator = require("./invoiceGenerator")
const { uploadPDF, makePublic } = require("./firebase")
const path = require("path")
const sendMail = require("./mailer")
require("dotenv").config()
const { getDetails, formatDateIST } = require("./getInvoiceDetails")
const fs = require("fs")
const cors = require("cors")
const adminRouter = require("./routes/adminRouter")
const getGoogleReviews = require("./services/getGoogleReviews")

const app = express()

app.use(cors())
app.use(express.json())
app.use("/pdfs", express.static("./saved_pdfs"))

app.use("/api/admin", adminRouter)

app.get("/api/google-reviews", async (req, res) => {
  const PLACE_ID = "ChIJMZ9YzabFADsRkYuobf0P7Ug"
  const API_KEY = process.env.GOOGLE_API_KEY

  try {
    const reviews = await getGoogleReviews(PLACE_ID, API_KEY, 4)
    res.json(reviews)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

const QUOTATION_DIRECTORY_PATH = path.join(__dirname, "saved_quotation_pdfs")
const INVOICE_DIRECTORY_PATH = path.join(__dirname, "saved_invoice_pdfs")

app.post("/genquotation", async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ status: "Invalid or empty JSON payload" })
  }

  const job = { content: req.body }
  const sanitizedName = job.content.customer?.name
    ?.replace(/[\\/:"*?<>|]/g, "_")
    .replace(/\s+/g, "_")
  const filename = `qu-${sanitizedName}-${formatDateIST(Date.now())}.pdf`
  const outputPath = path.join(QUOTATION_DIRECTORY_PATH, filename)
  try {
    await quotationGenerator(job.content, outputPath)

    console.log("Checking file before sendMail:", fs.existsSync(outputPath))
    await sendMail(job.content.email, filename, outputPath)

    console.log("Checking file before uploadPDF:", fs.existsSync(outputPath))
    await uploadPDF(outputPath, `quotations/${filename}`)
    //makePublic(`quotations/${filename}`)
    res.status(200).send({ status: "Job received" })
  } catch (err) {
    console.error("Job processing failed:", err)
  }
})

app.post("/geninvoice", async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ status: "Invalid or empty JSON payload" })
  }

  const job = { content: req.body }
  const sanitizedName = job.content.customer?.name
    ?.replace(/[\\/:"*?<>|]/g, "_")
    .replace(/\s+/g, "_")
  const filename = `in-${sanitizedName}-${formatDateIST(Date.now())}.pdf`
  console.log("name", filename)
  const outputPath = path.join(INVOICE_DIRECTORY_PATH, filename)
  try {
    await invoiceGenerator(job.content, outputPath)
    console.log("generated")
    await sendMail(job.content.email, filename, outputPath, false)
    console.log("mail send")
    await uploadPDF(outputPath, `invoices/${filename}`)
    console.log("upload done")
    const url = await makePublic(`invoices/${filename}`)
    res.status(200).send({ status: "Job succeeded", url: url })
  } catch (err) {
    console.error("Failed invoice gen or sendMail", err)
  }
})

app.get("/listinvoice", async (req, res) => {
  const list = await getDetails(DIRECTORY_PATH)
  res.status(200).send({ details: list })
})

app.delete("/delete-all-pdfs", (req, res) => {
  const directory = path.join(__dirname, "saved_pdfs")

  fs.readdir(directory, (err, files) => {
    if (err) {
      return res.status(500).send({ error: "Failed to read directory" })
    }

    for (const file of files) {
      fs.unlink(path.join(directory, file), (err) => {
        if (err) console.error(`Error deleting ${file}:`, err)
      })
    }

    res.send({ status: "All files deleted" })
  })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
