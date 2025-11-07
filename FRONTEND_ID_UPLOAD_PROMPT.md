
# Frontend ID Document Upload Implementation

## Prompt for Frontend Replit AI

```
Create a new page for ID document upload with the following specifications:

### Page Location
Create the page at: `pages/upload-documents.js` or `pages/apply/documents.js`

### Features Required

1. **User Authentication Check**
   - Verify user is logged in before showing the form
   - Redirect to login if not authenticated

2. **Document Upload Form**
   - Dropdown selector for document type with options:
     * "ID Card"
     * "Passport"
     * "Driver License"
   - File input for front image (required)
   - File input for back image (required)
   - Image preview for both uploads
   - File size validation (max 5MB per image)
   - Accept only image formats: .jpg, .jpeg, .png, .webp

3. **Image Processing**
   - Convert uploaded images to base64 format
   - Show file size warnings if images exceed 5MB
   - Display loading spinner during upload

4. **API Integration**
   - POST to `/api/upload-id-document` endpoint
   - Send data in this exact format:
   ```json
   {
     "documentType": "ID Card",
     "frontImage": "data:image/jpeg;base64,/9j/4AAQ...",
     "backImage": "data:image/jpeg;base64,/9j/4AAQ..."
   }
   ```

5. **User Feedback**
   - Show success message: "✅ Documents uploaded successfully!"
   - Show error messages for failures
   - Disable submit button until both images are selected
   - Clear form after successful upload

6. **Styling**
   - Clean, modern design matching the existing app theme
   - Mobile responsive layout
   - Use colors that match the banking theme (blues, whites, professional look)
   - Clear labels and instructions

### Technical Requirements

- Use React hooks (useState, useEffect)
- Use Supabase auth to get the current user
- Implement proper error handling
- Show clear validation messages
- Include accessible labels for screen readers

### Example Form Structure

The form should include:
- Page title: "Upload ID Documents"
- Instructions: "Please upload clear images of both sides of your ID document"
- Document type selector (dropdown)
- Front image upload with preview
- Back image upload with preview
- Submit button (disabled until valid)
- Status messages area

Make the upload experience smooth and user-friendly with clear feedback at every step.
```

## Backend API Endpoint (Already Implemented)

The API endpoint `/api/upload-id-document` is already set up in the admin repository and accepts:

**Request Body:**
```json
{
  "documentType": "ID Card" | "Passport" | "Driver License",
  "frontImage": "base64_encoded_image_string",
  "backImage": "base64_encoded_image_string"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Document uploaded successfully",
  "document": {
    "id": "uuid",
    "user_id": "uuid",
    "document_type": "ID Card",
    "status": "pending"
  }
}
```

**Response (Error):**
```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

## Database Table (Already Created)

The `user_id_documents` table structure:
```sql
- id (UUID)
- user_id (UUID) - References auth.users
- document_type (TEXT)
- front_url (TEXT)
- back_url (TEXT)
- status (TEXT) - default: 'pending'
- verified_at (TIMESTAMP)
- verified_by (UUID)
- rejection_reason (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## Notes

- Documents are stored in Supabase Storage bucket: `documents`
- Files are named with pattern: `id_documents/{userId}_front_{timestamp}.{ext}`
- Admin can review documents at: `/admin/view-user-documents`
- Status values: 'pending', 'verified', 'rejected'
