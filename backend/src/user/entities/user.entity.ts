import { IsDate, IsEmail, IsInt, IsOptional, IsString, IsUrl, IsUUID, Min } from "class-validator";

export class User {
    @IsOptional()
    @IsUrl()
    avatarUrl?: string | null

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
