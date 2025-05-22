package com.soccercoach.tracker.utils

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.pdf.PdfRenderer
import android.os.ParcelFileDescriptor
import android.view.View
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.CountDownLatch

class ImageExporter(private val context: Context) {
    
    /**
     * Generates a PNG image from HTML content using WebView capture
     */
    fun generateImage(htmlContent: String, fileName: String): File {
        val file = createOutputFile(fileName)
        val webView = WebView(context)
        
        // Make sure WebView has a size
        webView.layout(0, 0, 1080, 1920)  // HD resolution
        
        // Setup WebView for capture
        webView.isDrawingCacheEnabled = true
        
        // Wait for WebView to finish loading
        val latch = CountDownLatch(1)
        
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                // Wait a bit for rendering to complete
                view.postDelayed({
                    try {
                        // Create a bitmap and draw the WebView content onto it
                        val bitmap = Bitmap.createBitmap(
                            view.width, view.height, Bitmap.Config.ARGB_8888
                        )
                        val canvas = Canvas(bitmap)
                        view.draw(canvas)
                        
                        // Save the bitmap to a file
                        FileOutputStream(file).use { out ->
                            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
                        }
                    } finally {
                        latch.countDown()
                    }
                }, 500)
            }
        }
        
        // Load the HTML content
        webView.loadDataWithBaseURL(null, htmlContent, "text/html", "UTF-8", null)
        
        // Wait for the WebView to finish loading and capturing
        try {
            latch.await()
        } catch (e: InterruptedException) {
            Thread.currentThread().interrupt()
        }
        
        return file
    }
    
    /**
     * Alternative method that converts a PDF to an image
     */
    fun generateImageFromPdf(pdfFile: File, fileName: String): File {
        val imageFile = createOutputFile(fileName)
        
        try {
            // Open the PDF file
            val fileDescriptor = ParcelFileDescriptor.open(
                pdfFile, ParcelFileDescriptor.MODE_READ_ONLY
            )
            
            // Create a PDF renderer
            val renderer = PdfRenderer(fileDescriptor)
            val page = renderer.openPage(0)
            
            // Create a bitmap with the same dimensions as the PDF page
            val bitmap = Bitmap.createBitmap(
                page.width, page.height, Bitmap.Config.ARGB_8888
            )
            
            // Render the PDF page to the bitmap
            page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
            
            // Save the bitmap to a file
            FileOutputStream(imageFile).use { out ->
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
            }
            
            // Close everything
            page.close()
            renderer.close()
            fileDescriptor.close()
            
            return imageFile
        } catch (e: Exception) {
            throw RuntimeException("Failed to convert PDF to image: ${e.message}", e)
        }
    }
    
    private fun createOutputFile(fileName: String): File {
        val dir = File(context.getExternalFilesDir(null), "reports")
        if (!dir.exists()) {
            dir.mkdirs()
        }
        
        val file = File(dir, fileName)
        if (file.exists()) {
            file.delete()
        }
        
        return file
    }
}
