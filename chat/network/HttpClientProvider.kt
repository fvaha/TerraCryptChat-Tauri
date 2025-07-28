package xyz.terracrypt.chat.network

import android.content.Context
import kotlinx.coroutines.runBlocking
import okhttp3.Cache
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import xyz.terracrypt.chat.managers.TokenManager
import java.security.KeyStore
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager

interface HttpClientProvider {
    fun getClient(): OkHttpClient
}

class OkHttpClientProvider(
    private val context: Context,
    private val tokenManager: TokenManager
) : HttpClientProvider {

    private val okHttpClient: OkHttpClient by lazy {
        val cacheSize = (10 * 1024 * 1024).toLong()
        val cache = Cache(context.cacheDir, cacheSize)

        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        val sslContext = SSLContext.getInstance("TLS")
        val trustManager = provideTrustManager()
        sslContext.init(null, arrayOf(trustManager), null)

        OkHttpClient.Builder()
            .cache(cache)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(loggingInterceptor)
            .addInterceptor { chain ->
                val token = runBlocking { tokenManager.getAccessToken() }
                val request = if (!token.isNullOrBlank() && !tokenManager.isTokenExpired(token)) {
                    chain.request().newBuilder()
                        .addHeader("Authorization", "Bearer $token")
                        .build()
                } else {
                    chain.request()
                }
                chain.proceed(request)
            }
            .sslSocketFactory(sslContext.socketFactory, trustManager)
            .hostnameVerifier { _, _ -> true } //  trust dev domains; fine for your case
            .build()
    }

    override fun getClient(): OkHttpClient = okHttpClient

    private fun provideTrustManager(): X509TrustManager {
        val factory = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
        factory.init(null as KeyStore?)
        return factory.trustManagers
            .firstOrNull { it is X509TrustManager } as? X509TrustManager
            ?: throw IllegalStateException("No X509TrustManager found")
    }
}
