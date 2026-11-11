// TwilioHelper.test.js
import { jest } from '@jest/globals';

// Native ESM in this project requires jest.unstable_mockModule + a dynamic import of the
// module under test, instead of jest.mock()'s CJS-style hoisting/auto-mocking.
const mockMessagesCreate = jest.fn();
const MockTwilioClient = jest.fn(() => ({
  messages: {
    create: mockMessagesCreate,
  },
}));

jest.unstable_mockModule('twilio', () => ({
  default: MockTwilioClient,
}));

const { default: TwilioHelper } = await import('../TwilioHelper.js');

describe('TwilioHelper', () => {
  // Define mock environment variables
  const MOCK_ACCOUNT_SID = 'AC_TEST_SID';
  const MOCK_AUTH_TOKEN = 'test_auth_token';
  const MOCK_MESSAGING_SERVICE_SID = 'MG_TEST_SID';

  // Set up mock environment variables before all tests
  beforeAll(() => {
    process.env.TWILIO_ACCOUNT_SID = MOCK_ACCOUNT_SID;
    process.env.TWILIO_AUTH_TOKEN = MOCK_AUTH_TOKEN;
    process.env.TWILIO_MESSAGING_SERVICE_SID = MOCK_MESSAGING_SERVICE_SID;
  });

  // Clean up mock environment variables after all tests
  afterAll(() => {
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_MESSAGING_SERVICE_SID;
  });

  // Clear all mock calls and reset mock implementations before each test
  beforeEach(() => {
    MockTwilioClient.mockClear();
    mockMessagesCreate.mockClear();
  });

  describe('sendMessage', () => {
    it('should send a message successfully with default mediaUrl', async () => {
      // Arrange
      const toPhone = '+1234567890';
      const bodyMessage = 'Hello from Jest!';
      const expectedMessageSid = 'SM_TEST_SID_SUCCESS';

      // Configure the mock `create` method to resolve with a mock message object
      mockMessagesCreate.mockResolvedValueOnce({
        sid: expectedMessageSid,
        status: 'queued',
        // Add other properties you might access or need to verify
      });

      // Act
      const result = await TwilioHelper.sendMessage(toPhone, bodyMessage);

      // Assert

      // 1. Verify the Twilio client constructor was called
      expect(MockTwilioClient).toHaveBeenCalledTimes(1);
      expect(MockTwilioClient).toHaveBeenCalledWith(MOCK_ACCOUNT_SID, MOCK_AUTH_TOKEN);

      // 2. Verify `client.messages.create` was called correctly
      expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        messagingServiceSid: MOCK_MESSAGING_SERVICE_SID,
        body: bodyMessage,
        mediaUrl: ['https://demo.twilio.com/owl.png'], // Default value
        to: toPhone,
      });

      // 3. Verify the function returned the expected message object
      expect(result).toEqual({
        sid: expectedMessageSid,
        status: 'queued',
      });
    });

    it('should send a message successfully with custom mediaUrlList', async () => {
      // Arrange
      const toPhone = '+1987654321';
      const bodyMessage = 'Custom media test';
      const customMediaUrlList = ['http://example.com/image.jpg', 'http://example.com/video.mp4'];
      const expectedMessageSid = 'SM_CUSTOM_MEDIA_SID';

      mockMessagesCreate.mockResolvedValueOnce({
        sid: expectedMessageSid,
        status: 'queued',
      });

      // Act
      const result = await TwilioHelper.sendMessage(toPhone, bodyMessage, customMediaUrlList);

      // Assert
      expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        messagingServiceSid: MOCK_MESSAGING_SERVICE_SID,
        body: bodyMessage,
        mediaUrl: customMediaUrlList, // Should use the custom list
        to: toPhone,
      });
      expect(result).toEqual({
        sid: expectedMessageSid,
        status: 'queued',
      });
    });

    it('should handle errors when message sending fails', async () => {
      // Arrange
      const toPhone = '+11112223333';
      const bodyMessage = 'Error test';
      const mockError = new Error('Twilio API error: Invalid "To" number');

      // Configure the mock `create` method to reject with an error
      mockMessagesCreate.mockRejectedValueOnce(mockError);

      // Act
      const result = await TwilioHelper.sendMessage(toPhone, bodyMessage);

      // Assert
      expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
      expect(mockMessagesCreate).toHaveBeenCalledWith({
        messagingServiceSid: MOCK_MESSAGING_SERVICE_SID,
        body: bodyMessage,
        mediaUrl: ['https://demo.twilio.com/owl.png'], // Default mediaUrl still passed
        to: toPhone,
      });

      // The catch block in your original code returns the error object itself.
      // So we expect the result to be the error that was thrown.
      expect(result).toBe(mockError);
      expect(result.message).toBe('Twilio API error: Invalid "To" number');
    });
  });
});
