require("dotenv").config()
const express = require("express")
const pdfgenerator = require("./pdfgenerator")
const path = require("path")
const sendMail = require("./mailer")
require("dotenv").config()
const getDetails = require("./getInvoiceDetails")

const app = express()

app.use(express.json())

const DIRECTORY_PATH = path.join(__dirname, "saved_pdfs")
const CUSTOMER_MAIL = process.env.MAIL || "aziyan916@gmail.com"
const jobQueue = []

app.post("/geninvoice", (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ status: "Invalid or empty JSON payload" })
  }

  const genQueue = []
  genQueue.push({ type: "geninvoice", content: req.body })
  res.status(200).send({ status: "Job received" })
  const job = genQueue.shift()
  const filename = `quotation-${job.content.customer.replace(/\s+/g, "_")}-${Date.now()}.pdf`
  const outputPath = path.join(DIRECTORY_PATH, filename)
  pdfgenerator(job.content, `./saved_pdfs/${filename}`)
  sendMail(CUSTOMER_MAIL, filename, outputPath)
})

app.get("/listinvoice", async (req, res) => {
  //jobQueue.push({ type: "listinvoice" })

  const list = await getDetails(DIRECTORY_PATH)
  res.status(200).send({ details: list })
})

app.get("/getinvoice", (req, res) => {
  jobQueue.push({ type: "getinvoice" })
  res.status(200).send({ status: "Job received" })
})

app.get("/newjob", (req, res) => {
  if (jobQueue.length > 0) {
    const job = jobQueue.shift()
    res.status(200).json({ newJob: true, job })
  } else {
    res.status(200).json({ newJob: false })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
