import { OmitType } from "@nestjs/mapped-types";
import { User } from "../entities/user.entity.js";


export class CreateUserDto extends OmitType(User, ['id', 'createdAt', 'updatedAt']) {

}
