import { queryClient } from "../../App";
import { useMutation } from "@tanstack/react-query"

export interface Registrar {
    displayName: string;
    email: string;
    passwordHash: string;
}

export interface Login {
    email: string;
    password: string;
}

export interface RegistroFieldErrors {
    field: "displayName" | "email" | "passwordHash" | "confirmPassword";
    message: string;
}

export interface LoginFieldErrors {
    field: "email" | "password";
    message: string;
}

export const URL = "http://192.168.1.81:3000/auth"

export const useRegistrar  = () => {
    return useMutation({
        mutationFn: async(registrar: Registrar) => {
            const response = await fetch(`http://192.168.1.81:3000/user`, {
                method: "POST",
                headers: {
                    "Content-type": "application/json",
                },
                body: JSON.stringify(registrar),
            })

            const payload = await response.json().catch(() => null)

            if (!response.ok) {
                throw payload ?? { message: "Error al registrar" };
            }

            return payload
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["postRegister"]})
        }
    })
}

export const useLogin  = () => {
    return useMutation({
        mutationFn: async(login: Login) => {
            const response = await fetch(`${URL}/login`, {
                method: "POST",
                headers: {
                    "Content-type": "application/json",
                },
                body: JSON.stringify(login),
            })

            const payload = await response.json().catch(() => null)

            if (!response.ok) {
                throw payload ?? { message: "Error al iniciar sesión" };
            }

            return payload
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["postLogin"]})
        }
    })
}