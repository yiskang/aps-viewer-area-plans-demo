let { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_BUCKET, PORT, APS_SAMPLE_ENVIRONMENT, APS_MAXIMUM_MARKUPS_NUMBER } = process.env;
if (!APS_CLIENT_ID || !APS_CLIENT_SECRET) {
    console.warn('Missing some of the environment variables.');
    process.exit(1);
}

APS_BUCKET = APS_BUCKET || `${APS_CLIENT_ID.toLowerCase()}-basic-app`;
PORT = PORT || 8080;
APS_SAMPLE_ENVIRONMENT = APS_SAMPLE_ENVIRONMENT || 'NORMAL'; //!<<< Set to `Demonstration` to disable model upload and prevent users to create too many area markups
APS_MAXIMUM_MARKUPS_NUMBER = APS_MAXIMUM_MARKUPS_NUMBER || 5; //!<<< Maximum sensor number for demo mode

module.exports = {
    APS_CLIENT_ID,
    APS_CLIENT_SECRET,
    APS_BUCKET,
    APS_SAMPLE_ENVIRONMENT,
    APS_MAXIMUM_MARKUPS_NUMBER,
    PORT
};
