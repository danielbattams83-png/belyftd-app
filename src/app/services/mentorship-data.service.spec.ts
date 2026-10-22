import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {User} from 'firebase/auth';
import {FirebaseService, UserProfileDocument} from './firebase.service';
import {TierService} from './tier.service';
import {MentorshipDataService} from './mentorship-data.service';

describe('Hype Wall author identity', () => {
  function setup() {
    const firebase = {
      currentUser: signal<User | null>(null),
      userProfile: signal<UserProfileDocument | null>(null),
      subscriptionTier: signal(null),
      hasRegisteredUser: () => false,
      _getLocalStorageCompletedCourses: () => [],
    };
    TestBed.configureTestingModule({providers: [
      {provide: FirebaseService, useValue: firebase}, {provide: TierService, useValue: {}},
    ]});
    return {firebase, service: TestBed.inject(MentorshipDataService)};
  }

  it('uses the latest authenticated profile instead of demo data', () => {
    const {firebase, service} = setup();
    firebase.currentUser.set({uid: 'alex', displayName: 'Alex Auth', photoURL: 'https://example.com/auth.jpg'} as User);
    firebase.userProfile.set({id: 'alex', displayName: 'Alex Updated', avatarUrl: 'https://example.com/upload.jpg', grade: 'Grade 12', role: 'student'} as UserProfileDocument);
    expect(service.addCommunityPost('win', 'I finished my resume!', '#Career')).toBe(true);
    expect(service.communityPosts()[0]).toMatchObject({authorId: 'alex', authorName: 'Alex Updated', authorAvatar: 'https://example.com/upload.jpg', authorGrade: 'Grade 12'});
    firebase.userProfile.update(profile => ({...profile!, avatarUrl: 'https://example.com/new.jpg'}));
    service.addCommunityPost('win', 'Another win', '');
    expect(service.communityPosts()[0].authorAvatar).toBe('https://example.com/new.jpg');
  });

  it('uses auth metadata when a stale profile belongs to someone else', () => {
    const {firebase, service} = setup();
    firebase.currentUser.set({uid: 'alex', displayName: 'Alex', photoURL: 'https://example.com/alex.jpg'} as User);
    firebase.userProfile.set({id: 'other', displayName: 'Other', avatarUrl: 'https://example.com/other.jpg'} as UserProfileDocument);
    service.addCommunityPost('win', 'My win', '');
    expect(service.communityPosts()[0]).toMatchObject({authorName: 'Alex', authorAvatar: 'https://example.com/alex.jpg', authorGrade: 'Member'});
  });

  it('uses an initial fallback without a photo and refuses anonymous posts', () => {
    const {firebase, service} = setup();
    expect(service.addCommunityPost('win', 'Anonymous', '')).toBe(false);
    firebase.currentUser.set({uid: 'alex', displayName: 'Alex', photoURL: null} as User);
    firebase.userProfile.set({id: 'alex', role: 'mentor'} as UserProfileDocument);
    service.addCommunityPost('win', 'My win', '');
    expect(service.communityPosts()[0]).toMatchObject({authorName: 'Alex', authorAvatar: '', authorGrade: 'mentor'});
  });
});
