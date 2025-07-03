const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "abinyt1234@gmail.com",
    pass: "swlp nwpn klxq evjm",
  },
})

function sendMail(customerMail, filename, filepath, sub = true) {
  return new Promise((resolve, reject) => {
    const mailOptions = {
      from: "abinyt1234@gmail.com",
      to: customerMail,
      subject: sub
        ? "Quotation from IndusTech Automations"
        : "Invoice from IndusTech Automations",
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
