require("dotenv").config()
const express = require("express")
const pdfgenerator = require("./pdfgenerator")
const path = require("path")
const sendMail = require("./mailer")

const app = express()

app.use(express.json())

const CUSTOMER_MAIL = "aziyan916@gmail.com"
const jobQueue = []
const OUT_PATH = path.join(__dirname, "saved_pdfs")

app.post("/geninvoice", (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ status: "Invalid or empty JSON payload" })
  }

  jobQueue.push({ type: "geninvoice", content: req.body })
  res.status(200).send({ status: "Job received" })
  const job = jobQueue.shift()
  const filename = `quotation-${job.content.customer.replace(/\s+/g, "_")}-${Date.now()}.pdf`
  const outputPath = path.join(OUT_PATH, filename)
  pdfgenerator(job.content, `./saved_pdfs/${filename}`)
  sendMail(CUSTOMER_MAIL, filename, outputPath)
})

app.get("/listinvoice", (req, res) => {
  jobQueue.push({ type: "listinvoice" })
  res.status(200).send({ status: "Job received" })
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
