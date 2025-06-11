require("dotenv").config()
const express = require("express")
const app = express()

const jobQueue = []

app.post("/geninvoice", (req, res) => {
  jobQueue.push({ type: "geninvoice", content: req.body })
  res.status(200).send({ status: "Job received" })
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
  console.log("Server listening on port ${PORT}")
})
