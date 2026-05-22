import { ScrollView, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useAuthStore } from '../../../store/auth';
import { useRole } from '../../../hooks/useRole';
import { useParentChildStore } from '../../../store/parentChild';
import { getClassSubjects } from '../../../lib/api/core';
import { getStaffMember, getTeacherSubjects } from '../../../lib/api/staff';
import { getParent } from '../../../lib/api/parent';
import apiClient from '../../../lib/api/client';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

export default function SettingsScreen() {
  const { clearSession, userId, role, schoolId, schoolName, schoolBranchName, entityId } = useAuthStore();
  const { role: userRole } = useRole();
  const { selectedChild, children } = useParentChildStore();

  const handleLogout = async () => {
    await clearSession();
    router.replace('/(auth)/login');
  };

  const schoolDisplay = schoolBranchName ? `${schoolName} — ${schoolBranchName}` : schoolName;

  // ── Student ────────────────────────────────────────────────────────────────
  const { data: student } = useQuery({
    queryKey: ['student-self', entityId],
    queryFn: () => apiClient.get(`/students/${entityId}`).then((r) => r.data?.data),
    enabled: role === 'student' && !!entityId,
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['my-class-subjects', student?.class_section_id],
    queryFn: () => getClassSubjects(student!.class_section_id),
    enabled: !!student?.class_section_id,
  });
  const studentSubjects = subjectsData?.data ?? [];

  // ── Parent ─────────────────────────────────────────────────────────────────
  const { data: parentData } = useQuery({
    queryKey: ['parent-self', entityId],
    queryFn: () => getParent(entityId!).then((r) => r.data),
    enabled: role === 'parent' && !!entityId,
  });

  const parentClassSectionId = selectedChild?.class_section_id;
  const { data: parentSubjectsData } = useQuery({
    queryKey: ['child-class-subjects', parentClassSectionId],
    queryFn: () => getClassSubjects(parentClassSectionId!),
    enabled: !!parentClassSectionId,
  });
  const parentSubjects = parentSubjectsData?.data ?? [];

  // ── Staff / Teacher ────────────────────────────────────────────────────────
  const { data: staffData } = useQuery({
    queryKey: ['staff-self', entityId],
    queryFn: () => getStaffMember(entityId!).then((r) => r.data),
    enabled: (role === 'teacher' || role === 'staff') && !!entityId,
  });

  const { data: teacherSubjectsData } = useQuery({
    queryKey: ['teacher-subjects-self', entityId],
    queryFn: () => getTeacherSubjects(entityId!).then((r) => r.data),
    enabled: (role === 'teacher' || role === 'staff') && !!entityId,
  });
  const teacherSubjects: { id: string; subject: string; class_name?: string; section?: string }[] =
    teacherSubjectsData ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '700' }}>Profile</Text>

        {/* ── School ── */}
        {schoolDisplay && (
          <Card style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>School</Text>
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>{schoolDisplay}</Text>
          </Card>
        )}

        {/* ── Student ── */}
        {role === 'student' && (
          <>
            <Card style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>Student</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
                {student ? `${student.first_name} ${student.last_name ?? ''}`.trim() : '—'}
              </Text>
              {student?.class_name && (
                <Text style={{ fontSize: 13, color: '#4b5563' }}>
                  {student.class_name}{student.section ? ` — ${student.section}` : ''}
                </Text>
              )}
              {student?.admission_no && (
                <Row label="Admission No." value={student.admission_no} />
              )}
            </Card>
            {studentSubjects.length > 0 && (
              <Card>
                <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Subjects</Text>
                {studentSubjects.map((s: { id: string; subject: string; staff_name?: string }) => (
                  <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                    <Text style={{ fontSize: 13, color: '#111827' }}>{s.subject}</Text>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>{s.staff_name ?? '—'}</Text>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}

        {/* ── Parent ── */}
        {role === 'parent' && (
          <>
            <Card style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>Parent / Guardian</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
                {parentData?.name ?? '—'}
              </Text>
              {parentData?.phone && <Row label="Phone" value={parentData.phone} />}
            </Card>

            {children.length > 0 && (
              <Card>
                <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
                  {children.length === 1 ? 'Ward' : 'Wards'}
                </Text>
                {children.map((child) => (
                  <View key={child.id} style={{ marginBottom: children.length > 1 ? 8 : 0 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>
                      {child.first_name} {child.last_name ?? ''}
                    </Text>
                    {child.class_name && (
                      <Text style={{ fontSize: 12, color: '#4b5563' }}>
                        {child.class_name}{child.section ? ` — ${child.section}` : ''}
                      </Text>
                    )}
                  </View>
                ))}
              </Card>
            )}

            {selectedChild && (
              <Card>
                <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
                  {selectedChild.first_name}'s Subjects
                </Text>
                {parentSubjects.length > 0 ? (
                  parentSubjects.map((s: { id: string; subject: string; staff_name?: string }) => (
                    <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                      <Text style={{ fontSize: 13, color: '#111827' }}>{s.subject}</Text>
                      <Text style={{ fontSize: 12, color: '#6b7280' }}>{s.staff_name ?? '—'}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>No subjects assigned</Text>
                )}
              </Card>
            )}
          </>
        )}

        {/* ── Staff / Teacher ── */}
        {(role === 'teacher' || role === 'staff') && (
          <>
            <Card style={{ gap: 6 }}>
              <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>Staff</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>
                {staffData?.name ?? '—'}
              </Text>
              {staffData?.designation && <Row label="Designation" value={staffData.designation} />}
              {staffData?.category && (
                <Row label="Category" value={staffData.category.charAt(0).toUpperCase() + staffData.category.slice(1)} />
              )}
              {staffData?.emp_code && <Row label="Emp. Code" value={staffData.emp_code} />}
            </Card>
            {teacherSubjects.length > 0 && (
              <Card>
                <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>Teaching</Text>
                {teacherSubjects.map((ts) => (
                  <View key={ts.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                    <Text style={{ fontSize: 13, color: '#111827' }}>{ts.subject}</Text>
                    <Text style={{ fontSize: 12, color: '#6b7280' }}>
                      {ts.class_name ?? ''}
                      {ts.section ? ` ${ts.section}` : ''}
                    </Text>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}

        {/* ── Admin ── */}
        {role === 'admin' && (
          <Card style={{ gap: 6 }}>
            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>Account</Text>
            <Row label="Role" value="Administrator" />
            {schoolId && <Row label="School ID" value={schoolId} />}
          </Card>
        )}

        <Button title="Logout" variant="danger" onPress={handleLogout} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: 13, color: '#6b7280' }}>{label}</Text>
      <Text style={{ fontSize: 13, color: '#111827' }}>{value}</Text>
    </View>
  );
}
