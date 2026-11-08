import { IsDate, IsEmail, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export class User {
    // Id de un ícono de avatar (spec 011, D4); no es una URL.
    @IsOptional()
    @IsString()
    avatarId?: string | null

    @IsOptional()
    @IsDate()
    createdAt?: Date | null

    @IsString()
    displayName: string = ""

    @IsEmail()
    email: string = ""

    @IsUUID()
    id: string = ""

    @IsString()
    passwordHash: string = ""

    @IsOptional()
    @IsDate()
    updatedAt?: string | null
}
