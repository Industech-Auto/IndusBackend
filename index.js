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
const supabaseAdmin = require("./supabaseClient")
const { requireAdminAuth } = require("./middleware")

const app = express()

app.use(cors())
app.use(express.json())
app.use("/pdfs", express.static("./saved_pdfs"))

app.use("/api/admin", adminRouter)
app.post("/api/admin/register-user", requireAdminAuth, async (req, res) => {
  const { email, password, name, role } = req.body

  if (!email || !password || !name || !role) {
    return res
      .status(400)
      .json({ error: "Email, password, name, and role are required." })
  }

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { name, role },
    })

    if (error) {
      if (error.message.includes("already exists")) {
        return res
          .status(409)
          .json({ error: "User with this email already exists." })
      }
      throw error
    }

    res
      .status(201)
      .json({ message: "User registered successfully", user: data.user })
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to register user.", details: error.message })
  }
})

app.get("/api/admin/users", requireAdminAuth, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers()

    if (error) throw error

    const users = data.users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.user_metadata.name,
      role: user.user_metadata.role,
    }))

    res.status(200).json(users)
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch users.", details: error.message })
  }
})

app.delete("/api/admin/user/:id", requireAdminAuth, async (req, res) => {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({ error: "User ID is required." })
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id)

    if (error) throw error

    res.status(200).json({ message: "User deleted successfully." })
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to delete user.", details: error.message })
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
