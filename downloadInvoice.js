const axios = require("axios")
const fs = require("fs")
const path = require("path")

const BASE_URL = "https://jobqueue.onrender.com"
const DOWNLOAD_DIR = path.join(__dirname, "saved_pdfs")

async function downloadPDFs() {
  try {
    if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR)

    const { data } = await axios.get(`${BASE_URL}/listinvoice`)
    const pdfs = data.details

    for (const pdf of pdfs) {
      const filename = pdf.Name
      const url = `${BASE_URL}/pdfs/${filename}`
      console.log(url)
      const localPath = path.join(DOWNLOAD_DIR, filename)

      const response = await axios.get(url, { responseType: "stream" })

      const writer = fs.createWriteStream(localPath)
      response.data.pipe(writer)

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve)
        writer.on("error", reject)
      })

      console.log(`Downloaded: ${filename}`)
    }
    return true
  } catch (err) {
    console.error("Error downloading PDFs:", err)
    return false
  }
}

downloadPDFs()
