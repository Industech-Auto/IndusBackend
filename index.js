require("dotenv").config()
const express = require("express")
const quotationGenerator = require("./quotationGenerator")
const path = require("path")
const sendMail = require("./mailer")
require("dotenv").config()
const { getDetails, formatDateIST } = require("./getInvoiceDetails")
const fs = require("fs")
const cors = require("cors")

const app = express()

app.use(cors())
app.use(express.json())
app.use("/pdfs", express.static("./saved_pdfs"))

const DIRECTORY_PATH = path.join(__dirname, "saved_pdfs")
const jobQueue = []

app.post("/genquotation", (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ status: "Invalid or empty JSON payload" })
  }

  const genQueue = []
  genQueue.push({ type: "geninvoice", content: req.body })
  res.status(200).send({ status: "Job received" })
  const job = genQueue.shift()
  const filename = `quotation-${job.content.recipientName?.replace(/\s+/g, "_")}-${formatDateIST(Date.now())}.pdf`
  const outputPath = path.join(DIRECTORY_PATH, filename)
  quotationGenerator(job.content, `./saved_pdfs/${filename}`)
  sendMail(job.content.email, filename, outputPath)
})

app.get("/listinvoice", async (req, res) => {
  //jobQueue.push({ type: "listinvoice" })

  const list = await getDetails(DIRECTORY_PATH)
  res.status(200).send({ details: list })
})

app.get("/getinvoice", async (req, res) => {
  //jobQueue.push({ type: "getinvoice" })

  return res.status(200).send({
    status: "Job recieved",
  })
})

app.get("/newjob", (req, res) => {
  if (jobQueue.length > 0) {
    const job = jobQueue.shift()
    res.status(200).json({ newJob: true, job })
  } else {
    res.status(200).json({ newJob: false })
  }
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
