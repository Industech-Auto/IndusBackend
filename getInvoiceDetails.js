const fs = require("fs").promises
const path = require("path")

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatDateIST(timestamp) {
  const date = new Date(timestamp).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })

  return date.replace(/[\s,:]/g, "_")
}

async function getDetails(directoryPath) {
  try {
    const files = await fs.readdir(directoryPath)
    const result = []

    for (const file of files) {
      const filePath = path.join(directoryPath, file)
      const stats = await fs.stat(filePath)

      if (stats.isFile()) {
        result.push({
          Name: file,
          Size: formatSize(stats.size),
          Created: formatDateIST(stats.birthtime),
        })
      }
    }

    return result
  } catch (err) {
    console.error("Error reading directory", err)
    return []
  }
}

module.exports = { getDetails, formatDateIST }
