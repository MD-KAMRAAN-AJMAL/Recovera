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
