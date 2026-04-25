import crypto from 'crypto';

const algortihm = "aes-256-cbc"
const key = process.env.ENCRYPTION_KEY!

export function encrypt(text:string){
    const iv=crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algortihm,Buffer.from(key),iv)
    const encrypted = Buffer.concat([cipher.update(text),cipher.final()])
    return iv.toString("hex") + ":"+ encrypted.toString("hex")
}

export function decrypt(text: string){
    const [iVHex , encryptedHex ]= text.split(":")
    const iv = Buffer.from(iVHex,"hex")
    const encryptedText = Buffer.from(encryptedHex , "hex")

    const decipher = crypto.createDecipheriv(algortihm,Buffer.from(key),iv)
    const decrypted = Buffer.concat([
        decipher.update(encryptedText),
        decipher.final(),
    ])

    return decrypted.toString()
}

