import { query, pool } from './src/config/db.js';
import { 
  updateUserVerification, 
  rejectStudentProfile, 
  updateUserProfile,
  findUserById 
} from './src/repositories/user.repository.js';

async function testFlow() {
  console.log('🏁 Starting rejection and profile history verification test...');
  
  // 1. Pick a student (id = 61, NIHAR H)
  const studentId = 61;
  const originalStudent = await findUserById(studentId);
  console.log(`👤 Testing with student: ${originalStudent.name} (USN: ${originalStudent.usn})`);

  // Ensure they are verified first so we have a starting verified state
  console.log('🔄 Verifying student first to establish "last_verified_profile"...');
  await updateUserVerification(studentId, true);
  
  const verifiedStudent = await findUserById(studentId);
  console.log('✅ Student verified status:', verifiedStudent.verified);
  console.log('📸 Last verified profile snapshot size:', Object.keys(verifiedStudent.lastVerifiedProfile || {}).length);

  // 2. Reject the student's profile
  console.log('❌ Rejecting student profile with fields ["usn", "ugCgpa"]...');
  await rejectStudentProfile(
    studentId, 
    'Incorrect USN format and CGPA does not match marks card.',
    ['usn', 'ugCgpa']
  );

  const rejectedStudent = await findUserById(studentId);
  console.log('🚨 Student status after rejection:');
  console.log('   - rejected:', rejectedStudent.rejected);
  console.log('   - verified:', rejectedStudent.verified);
  console.log('   - rejectionReason:', rejectedStudent.rejectionReason);
  console.log('   - rejectedFields:', rejectedStudent.rejectedFields);
  console.log('   - lastVerifiedProfile preserved:', !!rejectedStudent.lastVerifiedProfile);

  // 3. Simulate student correcting/updating their profile
  console.log('✏️ Simulating student profile update (correcting USN and UG CGPA)...');
  const updatePayload = {
    name: verifiedStudent.name,
    collegeEmailId: verifiedStudent.collegeEmailId, // Keep original read-only
    personalEmailId: verifiedStudent.personalEmailId,
    phoneNumber: verifiedStudent.phoneNumber,
    aadhar: verifiedStudent.aadhar,
    linkedIn: verifiedStudent.linkedIn,
    gitHub: verifiedStudent.gitHub,
    usn: (verifiedStudent.usn || '1RV25MC062') + '-UPD', // Make it dynamic
    ugCgpa: (verifiedStudent.ugCgpa || 8.0) > 9.0 ? 8.5 : 9.5, // Make it dynamic
    firstSemSgpa: verifiedStudent.firstSemSgpa,
    tenthMarks: verifiedStudent.tenthMarks,
    twelfthMarks: verifiedStudent.twelfthMarks,
    gender: verifiedStudent.gender
  };

  await updateUserProfile(studentId, updatePayload);
  
  const updatedStudent = await findUserById(studentId);
  console.log('🔄 Student status after profile update:');
  console.log('   - rejected (should be false):', updatedStudent.rejected);
  console.log('   - verified (should be false):', updatedStudent.verified);
  console.log('   - rejectionReason (should be null):', updatedStudent.rejectionReason);
  console.log('   - rejectedFields (should be null):', updatedStudent.rejectedFields);
  console.log('   - lastVerifiedProfile (should be retained):', !!updatedStudent.lastVerifiedProfile);

  // 4. Simulate the SPC diff highlight detection
  console.log('🔍 Running SPC diff highlighting detection...');
  const fieldsToCheck = [
    'name', 'usn', 'collegeEmailId', 'personalEmailId', 'phoneNumber', 
    'aadhar', 'gender', 'ugCgpa', 'firstSemSgpa', 'tenthMarks', 'twelfthMarks'
  ];

  const editedFields = [];
  const lastProfile = updatedStudent.lastVerifiedProfile || {};

  for (const field of fieldsToCheck) {
    const lastVal = lastProfile[field];
    const currentVal = updatedStudent[field];

    const normalize = (val) => (val === null || val === undefined ? '' : String(val).trim());
    if (normalize(lastVal) !== normalize(currentVal)) {
      editedFields.push({
        field,
        lastVerifiedValue: lastVal,
        currentValue: currentVal
      });
    }
  }

  console.log('✨ Detected Edited Fields:');
  console.dir(editedFields);

  console.log('🎉 Test completed successfully!');
}

testFlow()
  .catch(console.error)
  .finally(() => pool.end());
