const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "abinyt1234@gmail.com",
    pass: "wpaa onru gorg rncs",
  },
})

function sendMail(customerMail, filename, filepath) {
  return new Promise((resolve, reject) => {
    const mailOptions = {
      from: "abinyt1234@gmail.com",
      to: customerMail,
      subject: "Your Requested File",
      text: "Please find the attached file.",
      attachments: [
        {
          filename: filename,
          path: filepath,
        },
      ],
    }

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.error("Error sending email:", error)
        reject(error)
      } else {
        console.log("Email sent:", info.response)
        resolve(info)
      }
    })
  })
}

module.exports = sendMail
