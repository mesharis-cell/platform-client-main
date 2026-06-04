export const throwApiError = (error: Error | unknown) => {
    let errorMessage = "Unknown error";
    let errorCode: string | undefined;
    let errorStatus: number | undefined;

    if (error instanceof Error) {
        // Check if it's an Axios error with a response
        const axiosError = error as {
            response?: { status?: number; data?: { message?: string; code?: string } };
        };
        errorMessage = axiosError.response?.data?.message || error.message;
        errorCode = axiosError.response?.data?.code;
        errorStatus = axiosError.response?.status;
    }
    // Preserve the structured signal so callers can branch on a machine-readable
    // `code` / HTTP `status` instead of regex-matching the message. `.message`
    // stays as-is, so existing `error.message` consumers are unaffected.
    const err = new Error(errorMessage);
    (err as Error & { code?: string; status?: number }).code = errorCode;
    (err as Error & { code?: string; status?: number }).status = errorStatus;
    throw err;
};
