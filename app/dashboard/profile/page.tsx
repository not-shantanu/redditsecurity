'use client';

import { useState, useEffect } from 'react';
import { User, Mail, Calendar, Save, Edit2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button, PageContainer, PageHeader, Card, Input, Separator } from '@/components/ui';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  updated_at?: string;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        toast.error('Failed to load user profile');
        return;
      }

      // Get user metadata
      const userProfile: UserProfile = {
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
        created_at: user.created_at || new Date().toISOString(),
        updated_at: user.updated_at || undefined,
      };

      setProfile(userProfile);
      setFullName(userProfile.full_name || '');
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const supabase = createClient();
      
      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName,
        },
      });

      if (error) throw error;

      // Update local state
      setProfile(prev => prev ? { ...prev, full_name: fullName, updated_at: new Date().toISOString() } : null);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFullName(profile.full_name || '');
    }
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="p-6">
        <PageContainer>
          <PageHeader title="Profile" description="Your account information" icon={User} />
          <Card>
            <div className="p-8 text-center text-ms-neutralSecondary">Loading profile...</div>
          </Card>
        </PageContainer>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <PageContainer>
          <PageHeader title="Profile" description="Your account information" icon={User} />
          <Card>
            <div className="p-8 text-center text-ms-neutralSecondary">Failed to load profile</div>
          </Card>
        </PageContainer>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6">
      <PageContainer>
        <PageHeader
          title="Profile"
          description="Manage your account information and preferences"
          icon={User}
        />

        <div className="space-y-6">
          {/* Profile Information Card */}
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-ms-neutral">Account Information</h2>
                {!isEditing && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    variant="secondary"
                    size="sm"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                {/* Email - Read Only */}
                <div>
                  <label className="block text-sm font-medium text-ms-neutral mb-1.5">
                    <Mail className="w-4 h-4 inline mr-2 text-ms-neutralTertiary" />
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={profile.email}
                    disabled
                    className="bg-ms-backgroundHover cursor-not-allowed"
                  />
                  <p className="text-xs text-ms-neutralSecondary mt-1">
                    Email cannot be changed
                  </p>
                </div>

                <Separator />

                {/* Full Name - Editable */}
                <div>
                  <label className="block text-sm font-medium text-ms-neutral mb-1.5">
                    <User className="w-4 h-4 inline mr-2 text-ms-neutralTertiary" />
                    Full Name
                  </label>
                  {isEditing ? (
                    <>
                      <Input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="mb-2"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={handleSave}
                          variant="primary"
                          size="sm"
                          disabled={saving}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {saving ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button
                          onClick={handleCancel}
                          variant="secondary"
                          size="sm"
                          disabled={saving}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 bg-ms-backgroundHover rounded-ms text-ms-neutral">
                      {profile.full_name || <span className="text-ms-neutralSecondary italic">Not set</span>}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Account Created Date */}
                <div>
                  <label className="block text-sm font-medium text-ms-neutral mb-1.5">
                    <Calendar className="w-4 h-4 inline mr-2 text-ms-neutralTertiary" />
                    Account Created
                  </label>
                  <div className="p-3 bg-ms-backgroundHover rounded-ms text-ms-neutral">
                    {formatDate(profile.created_at)}
                  </div>
                </div>

                {profile.updated_at && (
                  <>
                    <Separator />
                    <div>
                      <label className="block text-sm font-medium text-ms-neutral mb-1.5">
                        Last Updated
                      </label>
                      <div className="p-3 bg-ms-backgroundHover rounded-ms text-ms-neutral">
                        {formatDate(profile.updated_at)}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Account Statistics Card */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-ms-neutral mb-4">Account Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-ms-backgroundHover rounded-ms">
                  <div className="text-sm text-ms-neutralSecondary mb-1">User ID</div>
                  <div className="text-sm font-mono text-ms-neutral break-all">
                    {profile.id.substring(0, 8)}...
                  </div>
                </div>
                <div className="p-4 bg-ms-backgroundHover rounded-ms">
                  <div className="text-sm text-ms-neutralSecondary mb-1">Member Since</div>
                  <div className="text-sm text-ms-neutral">
                    {formatDate(profile.created_at)}
                  </div>
                </div>
                <div className="p-4 bg-ms-backgroundHover rounded-ms">
                  <div className="text-sm text-ms-neutralSecondary mb-1">Account Status</div>
                  <div className="text-sm text-ms-success font-medium">Active</div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}

