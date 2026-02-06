
import request from 'supertest';
import { describe, it, expect, jest, beforeEach, beforeAll } from '@jest/globals';
import CalendarEvent from '../../models/CalendarEvent';
import CalendarIntegration from '../../models/CalendarIntegration';

// Mock auth middleware FIRST
jest.mock('../../middleware/auth', () => ({
    authenticate: (req: any, res: any, next: any) => {
        req.user = { _id: 'test-user-id' };
        next();
    },
}));

// Mock googleapis
jest.mock('googleapis', () => ({
    google: {
        auth: { OAuth2: jest.fn().mockReturnValue({ setCredentials: jest.fn() }) },
        calendar: jest.fn().mockReturnValue({
            events: {
                insert: jest.fn()
            }
        })
    }
}));

// Mock Mongoose models
jest.mock('../../models/CalendarEvent');
jest.mock('../../models/CalendarIntegration');

import { google } from 'googleapis';

describe('Calendar Integration Routes', () => {
    let mockInsert: any;
    let app: any;

    beforeAll(() => {
        try {
            // Lazy load app to catch initialization errors
            app = require('../../server').default;
        } catch (error) {
            console.error("CRITICAL: Failed to load app in test:", error);
            // We cannot proceed if app fails to load
            throw error;
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Get the mock function instance
        mockInsert = (google.calendar as any)().events.insert;
        // Or better, reset the mock implementation
        (google.calendar as any).mockReturnValue({
            events: {
                insert: jest.fn()
            }
        });
        mockInsert = (google.calendar as any)().events.insert;
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

            // Reset mock insert for this test
            mockInsert.mockResolvedValue({
                data: {
                    id: 'google-event-id',
                    hangoutLink: 'https://meet.google.com/xyz-uvw-rst'
                }
            });

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

            await request(app)
                .post(`/api/calendar/events/${eventId}/sync-to-google`)
                .expect(200);

            // Verify meetingLink saved
            expect(mockEvent.meetingLink).toBe('https://meet.google.com/xyz-uvw-rst');
            expect(mockEventSave).toHaveBeenCalled();
        });
    });
});
