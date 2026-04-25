# Database Schema Documentation

This document explains the Prisma schema used for handling authentication (via NextAuth and GitHub) in the application. The schema defines three core models: `User`, `Account`, and `Session`.

---

## 1. User Model
The `User` model represents a physical person using the application. It acts as the central entity to which all other data (like OAuth accounts and active sessions) is linked.

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Fields Explained:
- **`id`**: A unique identifier automatically generated using `cuid()` (Collision Resistant Unique Identifier). It's secure, URL-safe, and scalable.
- **`name`**: The user's display name, fetched from their GitHub profile.
- **`email`**: The user's primary email address. It must be unique across the entire database.
- **`emailVerified`**: A timestamp indicating when the email was verified. *(Not strictly necessary for OAuth providers like GitHub, but required by NextAuth for compatibility).*
- **`image`**: A URL pointing to the user's avatar/profile picture from GitHub.
- **`accounts`**: A relation array pointing to the `Account` model. One user can have multiple linked OAuth accounts (e.g., GitHub, Google, Discord), though currently only GitHub is used.
- **`sessions`**: A relation array pointing to the `Session` model. One user can be logged in from multiple devices simultaneously.
- **`createdAt` / `updatedAt`**: Automatic timestamps tracking when the user profile was created and last modified.

---

## 2. Account Model
The `Account` model stores information about OAuth accounts (like GitHub) that are linked to a specific `User`. NextAuth uses this to manage the OAuth tokens required to make API requests on behalf of the user.

```prisma
model Account {
  id                 String  @id @default(cuid())
  userId             String
  type               String
  provider           String
  providerAccountId  String
  refresh_token      String?  @db.Text
  access_token       String?  @db.Text
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String?  @db.Text
  session_state      String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}
```

### Fields Explained:
- **`id`**: Unique identifier for the account record.
- **`userId`**: A foreign key linking this OAuth account to a specific `User`.
- **`type`**: The type of OAuth provider (e.g., `oauth`, `oidc`).
- **`provider`**: The name of the service provider (e.g., `"github"`).
- **`providerAccountId`**: The unique ID GitHub assigned to this user in their system.
- **`access_token`**: The secret token used to make authenticated requests to the GitHub API on the user's behalf. Stored as `@db.Text` because tokens can be very long.
- **`refresh_token`**: A token used to get a new `access_token` when the old one expires.
- **`expires_at`**: Unix timestamp indicating when the `access_token` will expire.
- **`token_type` / `scope` / `id_token` / `session_state`**: Additional OAuth metadata returned by GitHub. 
- **`user` (relation)**: Links back to the `User`. `onDelete: Cascade` means if the user deletes their account, all their linked OAuth data is automatically deleted too.
- **`@@unique(...)`**: Ensures a specific GitHub account cannot be linked to more than one User in our database.

---

## 3. Session Model
The `Session` model is used by NextAuth to manage active database sessions. Every time a user logs in, a new session is created here.

```prisma
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Fields Explained:
- **`id`**: Unique identifier for the session.
- **`sessionToken`**: A secure, randomly generated string that gets stored in the user's browser as a cookie. When the browser makes a request, it sends this token to prove they are logged in.
- **`userId`**: The foreign key indicating which `User` owns this session.
- **`expires`**: The date and time when this session becomes invalid (forcing the user to log in again). NextAuth manages rolling this expiration forward automatically.
- **`user` (relation)**: Links back to the `User`. `onDelete: Cascade` ensures that if a user is deleted, all their active login sessions are instantly destroyed.

---

## Why are all these tables needed?
If you only have GitHub login, you might wonder why we don't just put everything in the `User` table. 
1. **Security & Separation of Concerns**: The `User` table holds public/profile data, while `Account` securely isolates sensitive OAuth tokens (`access_token`). 
2. **Device Management**: The `Session` table allows a user to be logged in on their phone and laptop simultaneously, and logging out on one device won't affect the other.
3. **Future-Proofing**: This structure is NextAuth's industry standard. If you ever decide to add Google or Email login later, your database schema won't need to change—you'd just add a new row in the `Account` table for that user.

---

## How Data is Saved During Login (NextAuth + Prisma)

The beauty of using NextAuth alongside Prisma is that **you do not need to manually write SQL or Prisma queries to create the user**. 

By passing the `PrismaAdapter` into your NextAuth configuration, NextAuth automatically handles the entire database insertion process. 

### The Workflow:
1. **User Clicks Login**: The user clicks "Sign in with GitHub" and authorizes your application.
2. **GitHub Returns Data**: GitHub sends back the user's profile (Name, Email, Avatar) and their OAuth tokens (`access_token`).
3. **PrismaAdapter Takes Over**:
   - NextAuth checks if a `User` with that email already exists in the database.
   - **If it doesn't exist**: It creates a new `User` row and links a new `Account` row containing the GitHub tokens.
   - **If it does exist**: It logs them in and just updates any changed tokens in the `Account` table.
4. **Session Created**: Finally, it creates a new active `Session` in the database and sets the session cookie in the user's browser.

### Required Code (`app/api/auth/[...nextauth]/route.ts`)
To make this happen, your NextAuth config simply needs the adapter set up like this:

```typescript
import NextAuth from "next-auth"
import GithubProvider from "next-auth/providers/github"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import prisma from "@/lib/prisma" // Your instantiated Prisma Client

export const authOptions = {
  // 1. Tell NextAuth to use Prisma to store data
  adapter: PrismaAdapter(prisma), 
  
  // 2. Configure the GitHub Provider
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

As long as the adapter is configured, user creation and data population happen **100% automatically** upon a successful login.

---

## 📝 A Note on the Session Table and JWTs

In our specific configuration, we have explicitly told NextAuth to use **JSON Web Tokens (JWTs)** instead of database sessions by adding `session: { strategy: "jwt" }` to our `authOptions`.

### What does this mean?
Because we are using the JWT strategy, the `Session` table in your Prisma database **will remain completely empty**. NextAuth will store the session data entirely inside an encrypted cookie in the user's browser instead of writing rows to the database.

### Should we delete the `Session` model from `schema.prisma`?
**No, it is highly recommended to leave it there.**

1. **Adapter Requirements**: The NextAuth Prisma Adapter officially expects the `Session` model to exist in the schema. Even if it doesn't actively write to it when using JWTs, removing it can sometimes cause TypeScript or validation errors.
2. **Zero Cost**: It costs nothing to have an empty table in your Postgres database.
3. **Future Flexibility**: If you ever change your mind and decide you want to track active devices (for example, to add a "Log out of all other devices" feature), you can easily switch back to database sessions because the table is already set up and ready to go!
