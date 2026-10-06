import { queryClient } from "../../lib/api/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query"
import { apiFetch } from "../../lib/api/client";
import { type ApiError, parseApiError } from "../../lib/api/errors";
import { useAuth } from "../../context/AuthContext";

export interface Registrar {
    displayName: string;
    email: string;
    password: string;
}

export interface Login {
    email: string;
    password: string;
}

export interface LoginResponse {
    id: string;
    token: string;
}

export interface RegistroFieldErrors {
    field: "displayName" | "email" | "password" | "confirmPassword";
    message: string;
}

export interface LoginFieldErrors {
    field: "email" | "password";
    message: string;
}

const REGISTRO_TIMEOUT_MS = 10_000;
const REGISTRO_ERROR_GENERICO = "Error al registrar usuario. Inténtalo más tarde.";

export const useRegistrar  = () => {
    return useMutation<unknown, ApiError, Registrar>({
        mutationFn: async(registrar: Registrar) => {
            // Sin red o sin respuesta en 10 s: mensaje genérico (spec 001, M4).
            const response = await apiFetch("/user", null, {
                method: "POST",
                body: JSON.stringify(registrar),
            }, REGISTRO_TIMEOUT_MS).catch(() => {
                throw { message: REGISTRO_ERROR_GENERICO, fieldErrors: {} } satisfies ApiError;
            })

            const payload = await response.json().catch(() => null)

            // Un 5xx trae un mensaje técnico en inglés ("Internal server error"): se usa el genérico.
            if (response.status >= 500) {
                throw { message: REGISTRO_ERROR_GENERICO, fieldErrors: {} } satisfies ApiError;
            }
            if (!response.ok) {
                throw parseApiError(payload, REGISTRO_ERROR_GENERICO);
            }

            return payload
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["postRegister"]})
        }
    })
}

const LOGIN_TIMEOUT_MS = 10_000;
const LOGIN_ERROR_GENERICO = "Error al iniciar sesión. Inténtalo más tarde.";

export const useLogin  = () => {
    return useMutation<LoginResponse, ApiError, Login>({
        mutationFn: async(login: Login) => {
            // Sin red o sin respuesta en 10 s: mensaje genérico (como el registro, spec 001).
            const response = await apiFetch("/auth/login", null, {
                method: "POST",
                body: JSON.stringify(login),
            }, LOGIN_TIMEOUT_MS).catch(() => {
                throw { message: LOGIN_ERROR_GENERICO, fieldErrors: {} } satisfies ApiError;
            })

            const payload = await response.json().catch(() => null)

            if (response.status >= 500) {
                throw { message: LOGIN_ERROR_GENERICO, fieldErrors: {} } satisfies ApiError;
            }
            // CA-2: el 401 trae "Credenciales invalidas".
            if (!response.ok) {
                throw parseApiError(payload, LOGIN_ERROR_GENERICO);
            }

            return payload as LoginResponse
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["postLogin"]})
        }
    })
}

export const useProfile = () => {
    const { token } = useAuth();

    return useQuery({
        queryKey: ["profile", token],
        enabled: !!token,
        queryFn: async () => {
            const response = await apiFetch("/user/profile", token)

            const payload = await response.json().catch(() => null)

            if (!response.ok) {
                throw payload ?? { message: "Error al cargar el perfil" };
            }

            return payload
        },
    })
}