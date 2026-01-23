# Testing the /api/analyze-image Endpoint

## ✅ Implementation Complete!

All code has been successfully implemented:
- ✅ `@google/generative-ai` installed
- ✅ `server/services/gemini-service.ts` created
- ✅ `/api/analyze-image` endpoint added to `server/routes.ts`
- ✅ GEMINI_API_KEY added to Replit Secrets

## 🚀 How to Test

### Step 1: Start Server from Replit

**IMPORTANT**: The server must be started from Replit's interface (not from Cursor) to pick up the Secrets:

1. Click the **"Run"** button at the top of Replit
2. OR use the Replit Shell (not this terminal) and run:
   ```bash
   npm run dev
   ```

You should see the server start **without** the warning:
```
[gemini-service] GEMINI_API_KEY not found in environment variables
```

### Step 2: Test with cURL

Once the server is running, open a new terminal and test:

```bash
# Test 1: Verify endpoint exists
curl -X POST http://localhost:5000/api/analyze-image

# Expected: {"error":"Image file is required"}
```

```bash
# Test 2: Test with real image (use any product photo)
curl -X POST http://localhost:5000/api/analyze-image \
  -F "image=@/tmp/test-product.png"

# Expected: JSON with title, price, description, category, tags
```

### Step 3: Test from Browser/Postman

**URL**: `POST http://localhost:5000/api/analyze-image`

**Body**: `multipart/form-data`
- Field name: `image`
- Field type: File
- Value: Upload a product image

**Expected Response**:
```json
{
  "title": "Product Name Here",
  "price": 50,
  "description": "Two compelling sentences about the product. Perfect for buyers.",
  "category": "Electronics",
  "tags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}
```

## 📝 Example Frontend Integration

```javascript
async function analyzeImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const response = await fetch('/api/analyze-image', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    const data = await response.json();
    
    // Pre-fill your listing form
    setTitle(data.title);
    setPrice(data.price);
    setDescription(data.description);
    setCategory(data.category);
    setTags(data.tags);
    
    return data;
  } catch (error) {
    console.error('Image analysis failed:', error);
    throw error;
  }
}
```

## 🔍 Troubleshooting

### Issue: "Configuration error: API key not set"

**Cause**: Server not picking up GEMINI_API_KEY from Replit Secrets

**Solution**:
1. Verify the key is in Replit Secrets (lock icon, left sidebar)
2. Make sure it's named exactly `GEMINI_API_KEY` (case-sensitive)
3. Stop and restart the server using Replit's "Run" button
4. Do NOT start the server from Cursor's terminal

### Issue: "Failed to analyze image"

**Possible causes**:
1. Invalid API key - check Google AI Studio
2. Rate limit exceeded - wait a few minutes
3. Image too large - max 10MB
4. Invalid image format - only JPEG, PNG, WebP supported

### Issue: Analysis is inaccurate

**Solutions**:
- Use higher quality images
- Ensure product is clearly visible
- Use well-lit photos
- Try different angles

## ✨ What's Next?

1. **Test with various product images** - Try different categories
2. **Integrate into your frontend** - Add to your product listing form
3. **Monitor API usage** - Check Google AI Studio dashboard
4. **Adjust prompts if needed** - Edit `server/services/gemini-service.ts`

## 📊 API Quota

Google's Gemini API free tier:
- 60 requests per minute
- Check current limits at: https://ai.google.dev/pricing

## 🎯 Success Criteria

Your endpoint is working correctly when:
- ✅ No API key warnings in server logs
- ✅ Returns JSON (not error) for valid images
- ✅ Title is under 50 characters
- ✅ Price is an integer
- ✅ Description has 2 sentences
- ✅ Category is one of: Clothing, Home, Electronics, Other
- ✅ Exactly 5 tags with # prefix

---

**Ready to test!** Start the server from Replit and upload a product image!
