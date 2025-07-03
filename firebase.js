const admin = require("firebase-admin")
const serviceAccount = require("./ita-pdf-store-a00c3-firebase-adminsdk-fbsvc-f6f7209011.json")

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "ita-pdf-store-a00c3.firebasestorage.app",
})

const bucket = admin.storage().bucket()

async function uploadPDF(localPath, destPathInBucket) {
  try {
    await bucket.upload(localPath, {
      destination: destPathInBucket,
      metadata: {
        contentType: "application/pdf",
      },
    })
    console.log(`Uploaded to ${destPathInBucket}`)
    return { status: "Uploaded" }
  } catch (err) {
    console.error("Upload failed:", err)
    return { status: "Failed", error: err }
  }
}

async function makePublic(filePath) {
  const file = bucket.file(filePath)
  await file.makePublic()

  return `https://storage.googleapis.com/${bucket.name}/${filePath}`
}

module.exports = { uploadPDF, makePublic }
