
export default function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const applicationData = req.body;
      
      // Validate required fields
      const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'dob', 'ssnOrId', 'country', 'state', 'city', 'address', 'zipCode', 'selectedAccountTypes'];
      const missingFields = requiredFields.filter(field => !applicationData[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        });
      }
      
      // Generate application ID
      const applicationId = `APP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('Application received:', {
        id: applicationId,
        email: applicationData.email,
        name: `${applicationData.firstName} ${applicationData.lastName}`,
        accountTypes: applicationData.selectedAccountTypes
      });
      
      res.status(200).json({ 
        id: applicationId, 
        message: 'Application submitted successfully',
        email: applicationData.email
      });
    } catch (error) {
      console.error('Application processing error:', error);
      res.status(500).json({ 
        error: 'Internal server error' 
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
