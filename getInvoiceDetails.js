const fs = require("fs").promises
const path = require("path")

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
          Size: stats.size,
          Created: stats.birthtime,
        })
      }
    }

    return result
  } catch (err) {
    console.error("Error reading directory", err)
    return []
  }
}

module.exports = getDetails
