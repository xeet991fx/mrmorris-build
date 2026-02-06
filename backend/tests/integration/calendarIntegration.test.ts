
import request from 'supertest';
import app from '../../src/server';
import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';
import CalendarEvent from '../../src/models/CalendarEvent';
import CalendarIntegration from '../../src/models/CalendarIntegration';

// Mock auth middleware
jest.mock('../../src/middleware/auth', () => ({
    authenticate: (req: any, res: any, next: any) => {
        req.user = { _id: 'test-user-id' };
        next();
    },
}));

// Mock googleapis
const mockInsert = jest.fn();
jest.mock('googleapis', () => ({
    google: {
        auth: { OAuth2: jest.fn().mockReturnValue({ setCredentials: jest.fn() }) },
        calendar: jest.fn().mockReturnValue({
            events: {
                insert: mockInsert
            }
        })
    }
}));

// Mock Mongoose models
jest.mock('../../src/models/CalendarEvent');
jest.mock('../../src/models/CalendarIntegration');

describe('Calendar Integration Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockInsert.mockReset();
    });

    describe('POST /api/calendar/events', () => {
        it('should create an event and save meetingLink when syncToGoogle is true', async () => {
            const workspaceId = 'test-workspace-id';
            const eventData = {
                workspaceId,
                title: 'Test Meeting',
                startTime: new Date().toISOString(),
                syncToGoogle: true
            };

            // Mock CalendarIntegration.findOne
            (CalendarIntegration.findOne as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    getAccessToken: () => 'access-token',
                    getRefreshToken: () => 'refresh-token',
                    save: jest.fn()
                })
            } as any);

            // Mock Google Insert Response
            mockInsert.mockResolvedValue({
                data: {
                    id: 'google-event-id',
                    hangoutLink: 'https://meet.google.com/abc-defg-hij'
                }
            });

            // Mock CalendarEvent.create
            const mockEventSave = jest.fn();
            const mockEvent = {
                save: mockEventSave,
                externalId: '',
                provider: '',
                meetingLink: ''
            };
            (CalendarEvent.create as jest.Mock).mockResolvedValue(mockEvent as any);

            await request(app)
                .post('/api/calendar/events')
                .send(eventData)
                .expect(201);

            // Verify Google API called with conferenceData
            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                requestBody: expect.objectContaining({
                    conferenceData: expect.objectContaining({
                        createRequest: expect.objectContaining({
                            conferenceSolutionKey: { type: 'hangoutsMeet' }
                        })
                    })
                }),
                conferenceDataVersion: 1
            }));

            // Verify meetingLink saved
            expect(mockEvent.meetingLink).toBe('https://meet.google.com/abc-defg-hij');
            expect(mockEventSave).toHaveBeenCalled();
        });
    });

    describe('POST /api/calendar/events/:eventId/sync-to-google', () => {
        it('should sync event and save meetingLink', async () => {
            const eventId = 'test-event-id';

            // Mock CalendarEvent.findById
            const mockEventSave = jest.fn();
            const mockEvent = {
                _id: eventId,
                workspaceId: 'test-workspace-id',
                title: 'Test Meeting',
                startTime: new Date(),
                endTime: new Date(),
                save: mockEventSave,
                externalId: '',
                provider: '',
                meetingLink: ''
            };
            (CalendarEvent.findById as jest.Mock).mockResolvedValue(mockEvent as any);

            // Mock Integration
            (CalendarIntegration.findOne as jest.Mock).mockReturnValue({
                select: jest.fn().mockReturnValue({
                    getAccessToken: () => 'access-token',
                    getRefreshToken: () => 'refresh-token',
                    save: jest.fn()
                })
            } as any);

            // Mock Google Insert Response
            mockInsert.mockResolvedValue({
                data: {
                    id: 'google-event-id',
                    hangoutLink: 'https://meet.google.com/xyz-uvw-rst'
                }
            });

            await request(app)
                .post(`/api/calendar/events/${eventId}/sync-to-google`)
                .expect(200);

            // Verify meetingLink saved
            expect(mockEvent.meetingLink).toBe('https://meet.google.com/xyz-uvw-rst');
            expect(mockEventSave).toHaveBeenCalled();
        });
    });
});
