const { Router } = require("express")
const { requireAdminAuth } = require("./middleware")

const adminRouter = Router()

adminRouter.post("/register-user", requireAdminAuth, async (req, res) => {
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

adminRouter.get("/users", requireAdminAuth, async (req, res) => {
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

adminRouter.delete("/user/:id", requireAdminAuth, async (req, res) => {
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

module.exports = adminRouter
