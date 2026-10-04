import ProfileForm from '../../components/ProfileForm';
import FarmerKycForm from '../../components/FarmerKycForm';

/**
 * FarmerProfile - farmer account details + farm information.
 */
const FarmerProfile = () => (
  <div className="space-y-6">
  <ProfileForm
    title="Farmer Profile"
    subtitle="Manage your personal and farm details"
    extraFields={[
      { key: 'farmName', label: 'Farm Name', placeholder: 'e.g. Green Valley Farm', required: true },
      { key: 'farmLocation', label: 'Farm Location', placeholder: 'e.g. Nashik, Maharashtra', required: true },
      { key: 'farmSizeAcres', label: 'Farm Size (acres)', placeholder: 'e.g. 12.5', type: 'number', min: 0, step: 0.1, required: true },
      {
        key: 'farmingType',
        label: 'Farming Type',
        type: 'select',
        required: true,
        options: [
          { value: 'organic', label: 'Organic' },
          { value: 'conventional', label: 'Conventional' },
          { value: 'mixed', label: 'Mixed' },
        ],
      },
      { key: 'cropCategories', label: 'Crop Categories', placeholder: 'e.g. Vegetables, Fruits', required: true },
      { key: 'yearsOfExperience', label: 'Years of Experience', placeholder: 'e.g. 8', type: 'number', min: 0, required: true },
      { key: 'upiId', label: 'UPI ID for Payouts', placeholder: 'e.g. patil.farm@upi', required: true },
    ]}
  />
  <FarmerKycForm />
  </div>
);

export default FarmerProfile;
