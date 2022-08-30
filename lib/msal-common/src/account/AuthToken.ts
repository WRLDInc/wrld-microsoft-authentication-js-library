/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { TokenClaims } from "./TokenClaims";
import { DecodedAuthToken } from "./DecodedAuthToken";
import { ClientAuthError } from "../error/ClientAuthError";
import { StringUtils } from "../utils/StringUtils";
import { ICrypto } from "../crypto/ICrypto";

/**
 * JWT Token representation class. Parses token string and generates claims object.
 */
export class AuthToken {

    // Raw Token string
    rawToken: string;
    // Claims inside token
    claims: TokenClaims;
    constructor(rawToken: string, crypto: ICrypto) {
        if (StringUtils.isEmpty(rawToken)) {
            throw ClientAuthError.createTokenNullOrEmptyError(rawToken);
        }

        this.rawToken = rawToken;
        this.claims = AuthToken.extractTokenClaims(rawToken, crypto);
    }

    /**
     * Extract token by decoding the rawToken
     *
     * @param encodedToken
     */
    static extractTokenClaims(encodedToken: string, crypto: ICrypto): TokenClaims {

        const decodedToken: DecodedAuthToken = StringUtils.decodeAuthToken(encodedToken);

        // token will be decoded to get the username
        try {
            const base64TokenPayload = decodedToken.JWSPayload;

            // base64Decode() should throw an error if there is an issue
            const base64Decoded = crypto.base64Decode(base64TokenPayload);
            return JSON.parse(base64Decoded) as TokenClaims;
        } catch (err) {
            throw ClientAuthError.createTokenParsingError(err);
        }
    }

    /**
     * Determine if the token's max_age has transpired
     */
    static checkMaxAge(authTime: number | undefined, maxAge: number): void {
        /*
         * per https://auth0.com/docs/authenticate/login/max-age-reauthentication
         * To force an immediate re-authentication: If an app requires that a user re-authenticate prior to access,
         * provide a value of 0 for the max_age parameter and the AS will force a fresh login.
         */
        if (maxAge === 0) {
            throw ClientAuthError.createMaxAgeTranspiredError();
        }

        if (!authTime) {
            throw ClientAuthError.createAuthTimeNotFoundError();
        }

        const twoMinuteSkew = 120000; // two minutes in milliseconds
        if ((Date.now() - twoMinuteSkew) > (authTime + maxAge)) {
            throw ClientAuthError.createMaxAgeTranspiredError();
        }
    }
}
