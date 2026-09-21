import { IsDate, IsEmail, IsInt, IsOptional, IsPhoneNumber, IsString, IsUrl, IsUUID, Min } from "class-validator";

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

    @IsOptional()
    @IsString()
    emergencyContactName?: string

    @IsOptional()
    @IsPhoneNumber()
    emergencyContactPhone?: string

    @IsUUID()
    id: string = ""

    @IsString()
    passwordHash: string = ""

    @IsOptional()
    @IsDate()
    updatedAt?: string | null
}
