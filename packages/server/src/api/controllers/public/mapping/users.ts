import { User } from "./types"

function user(body: any): User {
  return {
    _id: body._id,
    email: body.email,
    password: body.password,
    status: body.status,
    firstName: body.firstName,
    lastName: body.lastName,
    forceResetPassword: body.forceResetPassword,
    builder: body.builder,
    admin: body.admin,
    roles: body.roles,
  }
}

function mapUser(ctx: any): { data: User } {
  return {
    data: user(ctx.body),
  }
}

function mapUsers(ctx: any): { data: User[] } {
  const users = ctx.body.map((body: any) => user(body))
  return { data: users }
}

export default {
  mapUser,
  mapUsers,
}
