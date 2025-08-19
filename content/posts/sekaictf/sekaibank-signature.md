---
title: SekaiBank Signature
summary: Welcome to the Sekai Bank challenge!
tags: [SekaiCTF, Reverse, APK]
date: 2025-08-18
---

## Description

Welcome to the Sekai Bank challenge!

Difficulty: 🔶🔷🔷🔷  
Author: Marc

[Given files](/sekaictf/sekaibank-signature/SekaiBank.apk)

## Solution

The goal of this challenge is to reverse engineer an APK to retrieve a hidden flag.

I began by using Jadx to decompile the APK and retrieve the source code.

```sh
$ jadx SekaiBank.apk
````

Next, I searched for the string `flag` across the decompiled files, which led me to an interesting file.

```ApiService.java
public interface ApiService {
    @PUT("auth/pin/change")
    Call<ApiResponse<Void>> changePin(@Body PinRequest pinRequest);

    @GET("user/search/{username}")
    Call<ApiResponse<User>> findUserByUsername(@Path("username") String str);

    @GET("user/balance")
    Call<ApiResponse<BalanceResponse>> getBalance();

    @POST("flag")
    Call<String> getFlag(@Body FlagRequest flagRequest);

    @GET("user/profile")
    Call<ApiResponse<User>> getProfile();

    @GET("transactions/recent")
    Call<ApiResponse<List<Transaction>>> getRecentTransactions();

    @GET("transactions/{id}")
    Call<ApiResponse<Transaction>> getTransaction(@Path("id") String str);

    @GET("transactions")
    Call<ApiResponse<List<Transaction>>> getTransactions(@Query("page") int i, @Query("limit") int i2);

    @GET("user/profile")
    Call<ApiResponse<User>> getUserProfile();

    @GET("health")
    Call<ApiResponse<HealthResponse>> healthCheck();

    @POST("auth/login")
    Call<ApiResponse<AuthResponse>> login(@Body LoginRequest loginRequest);

    @POST("auth/logout")
    Call<ApiResponse<Void>> logout();

    @POST("auth/refresh")
    Call<ApiResponse<AuthResponse>> refreshToken(@Body RefreshTokenRequest refreshTokenRequest);

    @POST("auth/register")
    Call<ApiResponse<AuthResponse>> register(@Body RegisterRequest registerRequest);

    @POST("transactions/send")
    Call<ApiResponse<Transaction>> sendMoney(@Body SendMoneyRequest sendMoneyRequest);

    @POST("auth/pin/setup")
    Call<ApiResponse<Void>> setupPin(@Body PinRequest pinRequest);

    @POST("auth/pin/verify")
    Call<ApiResponse<Void>> verifyPin(@Body PinRequest pinRequest);
}
```

From the interface, it looks like we need to retrieve the flag by calling the `POST /flag` endpoint.
To make that request, we need the base URL of the API.
Luckily, I easily found it in another file.

```ApiClient.java
private static final String BASE_URL = "https://sekaibank-api.chals.sekai.team/api/";
```

I then tried to call the flag endpoint using `curl`:

```sh
$ curl -X POST https://sekaibank-api.chals.sekai.team/api/flag
{"success":false,"error":"X-Signature header is required"}
```

However, the request failed with an error message saying that the `X-Signature` header was missing.
After some investigation, I found the function that computes it in the decompiled code.

```ApiClient.java
private String generateSignature(Request request) throws IOException, GeneralSecurityException {
    Signature[] signatureArr;
    String str = request.method() + "/api".concat(getEndpointPath(request)) + getRequestBodyAsString(request);
    SekaiApplication sekaiApplication = SekaiApplication.getInstance();
    PackageManager packageManager = sekaiApplication.getPackageManager();
    String packageName = sekaiApplication.getPackageName();

    try {
        if (Build.VERSION.SDK_INT >= 28) {
            PackageInfo packageInfo = packageManager.getPackageInfo(packageName, 134217728);
            SigningInfo signingInfo = packageInfo.signingInfo;

            if (signingInfo != null) {
                if (signingInfo.hasMultipleSigners()) {
                    signatureArr = signingInfo.getApkContentsSigners();
                } else {
                    signatureArr = signingInfo.getSigningCertificateHistory();
                }
            } else {
                signatureArr = packageInfo.signatures;
            }
        } else {
            signatureArr = packageManager.getPackageInfo(packageName, 64).signatures;
        }

        if (signatureArr != null && signatureArr.length > 0) {
            MessageDigest messageDigest = MessageDigest.getInstance("SHA-256");
            for (Signature signature : signatureArr) {
                messageDigest.update(signature.toByteArray());
            }
            return calculateHMAC(str, messageDigest.digest());
        }

        throw new GeneralSecurityException("No app signature found");
    } catch (PackageManager.NameNotFoundException | NoSuchAlgorithmException e) {
        throw new GeneralSecurityException("Unable to extract app signature", e);
    }
}
```

The signature is generated using two main components:
* `str`: A concatenation of the request method (e.g., `POST`), the API endpoint (e.g., `/api/flag`), and the request body.
* `signatureArr`: The APK's signing certificates.

To find the body of the request, I went back to the `ApiService.java` file and looked at the `getFlag` method:

```ApiService.java
@POST("flag")
Call<String> getFlag(@Body FlagRequest flagRequest);
```

Here, we see that the body is a `FlagRequest` object.
The object contains a boolean field `unmask_flag` that determines whether the flag should be exposed or masked.

```FlagRequest.java
public class FlagRequest {
    private boolean unmask_flag;

    public FlagRequest(boolean z) {
        this.unmask_flag = z;
    }

    public boolean getUnmaskFlag() {
        return this.unmask_flag;
    }

    public void setUnmaskFlag(boolean z) {
        this.unmask_flag = z;
    }
}
```

To retrieve the flag, we want to set `unmask_flag` to `true`.
So the body will look like this:

```json
{"unmask_flag": true}
```

The next step is to obtain the signatures of the APK.
Thankfully, Jadx-gui provides an easy way to extract this information.

```
Signer 1
    Type: X.509
    Version: 1
    Serial number: 0x1
    Subject: C=ID, ST=Bali, L=Indonesia, O=HYPERHUG, OU=Development, CN=Aimar S. Adhitya
    Valid from: Sun May 18 14:38:07 CEST 2025
    Valid until: Thu May 12 14:38:07 CEST 2050

    Public key type: RSA
    Exponent: 65537
    Modulus size (bits): 2048
    Modulus: [MODULUS DATA HERE]

    Signature type: SHA256withRSA
    Signature OID: 1.2.840.113549.1.1.11

    MD5 Fingerprint: FC AB 4A F1 F7 41 1B 4B A7 0E C2 FA 91 5D EE 8E 
    SHA-1 Fingerprint: 2C 97 60 EE 96 15 AD AB DE E0 E2 28 AE D9 1E 3D 4E BD EB DF 
    SHA-256 Fingerprint: 3F 3C F8 83 0A CC 96 53 0D 55 64 31 7F E4 80 AB 58 1D FC 55 EC 8F E5 5E 67 DD DB E1 FD B6 05 BE 
```

With this information, we can now generate the `X-Signature` header using a Python script.

```py
import hmac
import hashlib
import json

# --- Step 1: Use provided SHA-256 digest of certificate ---
key_hex = "3f3cf8830acc96530d5564317fe480ab581dfc55ec8fe55e67dddbE1fdb605be"
key = bytes.fromhex(key_hex)

# --- Step 2: Construct the exact message to be signed ---
http_method = "POST"
endpoint_path = "/flag"
body_dict = {"unmask_flag": True}

# Mimic Java's JSON serialization: compact, no spaces
request_body = json.dumps(body_dict, separators=(",", ":"))

# Final message
message = http_method + "/api" + endpoint_path + request_body

# --- Step 3: HMAC-SHA256 signature ---
mac = hmac.new(key, msg=message.encode("utf-8"), digestmod=hashlib.sha256)
signature = mac.hexdigest()

print("X-Signature:", signature)
```

Finally, after generating the `X-Signature`, I was able to send the following `curl` request to retrieve the flag:

```sh
$ curl -X POST https://sekaibank-api.chals.sekai.team/api/flag -H 'X-Signature: 440ba2925730d137259f297fd6fba02af2f7b6c414dd16a1ac336e9047cdb8f5' -H 'Content-Type: application/json' -d '{"unmask_flag":true}'
SEKAI{are-you-ready-for-the-real-challenge?}
```
