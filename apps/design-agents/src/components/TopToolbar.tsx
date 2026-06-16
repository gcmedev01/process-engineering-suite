import { useRef, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  AutoFixHigh as AgentIcon,
  Brightness4 as DarkIcon,
  Brightness7 as LightIcon,
  CloudDownload as CloudLoadIcon,
  CloudUpload as CloudSaveIcon,
  DeleteSweep as ClearIcon,
  Menu as MenuIcon,
  Save as SaveIcon,
  Settings as SettingsIcon,
  UploadFile as LoadIcon,
} from '@mui/icons-material';
import { useDesignStore } from '../store/useDesignStore';
import { DesignState } from '../types';
import { StatusIndicator } from './common/StatusIndicator';
import { useSavedSessions } from '../hooks/useSavedSessions';

interface TopToolbarProps {
  onToggleTheme: () => void;
  isDarkMode: boolean;
  onMenuClick?: () => void;
}

const HOME_HREF = import.meta.env.VITE_WEB_URL || "http://localhost:3000";

export const TopToolbar = ({ onToggleTheme, isDarkMode, onMenuClick }: TopToolbarProps) => {
  const theme = useTheme();
  const { activeStepId, steps, designState, setActiveStep, setDesignState, updateDesignState, clearProject } = useDesignStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { save: cloudSave, fetchList, savedItems, isSaving, isLoading } = useSavedSessions();
  const [cloudSaveOpen, setCloudSaveOpen] = useState(false);
  const [cloudLoadOpen, setCloudLoadOpen] = useState(false);
  const [sessionName, setSessionName] = useState('');

  const completedSteps = steps.filter((step) => step.status === 'completed').length;
  const progress = steps.length === 0 ? 0 : (completedSteps / steps.length) * 100;
  const activeStep = steps.find((step) => step.id === activeStepId);

  const handleSave = () => {
    const exportState = {
      ...designState,
      llmSettings: designState.llmSettings
        ? { ...designState.llmSettings, apiKey: undefined }
        : undefined,
    };
    const dataStr = JSON.stringify(exportState, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `design_project_${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadedEvent) => {
      try {
        const content = loadedEvent.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Invalid project file');
        }
        const currentApiKey = designState.llmSettings?.apiKey;
        const loadedState = parsed as DesignState;
        const nextState = {
          ...loadedState,
          llmSettings: loadedState.llmSettings
            ? { ...loadedState.llmSettings, apiKey: currentApiKey }
            : designState.llmSettings,
        };
        setDesignState(nextState);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } catch (error) {
        console.error('Failed to load project file:', error);
        alert('Invalid project file.');
      }
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    if (window.confirm('Clear all project data? (LLM settings will be preserved)')) {
      clearProject();
    }
  };

  const handleTurboToggle = (enabled: boolean) => {
    updateDesignState({ turbo_mode: enabled });
  };

  const handleCloudSave = async () => {
    if (!sessionName.trim()) return;
    const completedIds = steps.filter((s) => s.status === 'completed').map((s) => s.id);
    try {
      await cloudSave(
        sessionName.trim(),
        designState as unknown as Record<string, unknown>,
        activeStepId,
        completedIds,
      );
      setCloudSaveOpen(false);
      setSessionName('');
    } catch {
      // error handled inside hook
    }
  };

  const handleOpenCloudLoad = async () => {
    setCloudLoadOpen(true);
    await fetchList();
  };

  const handleLoadSession = (session: (typeof savedItems)[number]) => {
    setDesignState(session.stateData as unknown as DesignState);
    setCloudLoadOpen(false);
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleFileChange}
      />
      <Box
        sx={{
          px: { xs: 1.5, md: 2.5 },
          py: 1,
          borderBottom: `1px solid ${alpha(theme.palette.primary.light, theme.palette.mode === 'dark' ? 0.25 : 0.14)}`,
          background: theme.palette.mode === 'dark'
            ? 'linear-gradient(90deg, rgba(10,18,33,0.95) 0%, rgba(13,24,42,0.88) 100%)'
            : 'linear-gradient(90deg, rgba(255,255,255,0.95) 0%, rgba(244,248,255,0.88) 100%)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
          <Stack direction="row" alignItems="center" gap={1.25} minWidth={0}>
            {onMenuClick && (
              <IconButton onClick={onMenuClick} edge="start" sx={{ display: { md: 'none' } }}>
                <MenuIcon />
              </IconButton>
            )}
            <Box
              component="a"
              href={HOME_HREF}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                minWidth: 0,
                color: 'inherit',
                textDecoration: 'none',
                borderRadius: 1.5,
                outline: 'none',
                '&:focus-visible': {
                  boxShadow: `0 0 0 3px ${theme.palette.primary.main}`,
                },
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2,
                  display: 'grid',
                  placeItems: 'center',
                  background: `linear-gradient(160deg, ${alpha(theme.palette.primary.main, 0.3)} 0%, ${alpha(theme.palette.secondary.main, 0.35)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.primary.light, 0.35)}`,
                  flexShrink: 0,
                }}
              >
                <AgentIcon sx={{ color: '#38bdf8', fontSize: 24 }} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ lineHeight: 1.1, fontWeight: 700 }}>
                  Process Design Agents
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {activeStep ? `Current Stage: ${activeStep.label}` : 'Workflow Control Center'}
                </Typography>
              </Box>
            </Box>
          </Stack>

          <Box sx={{ flex: 1, maxWidth: 420, display: { xs: 'none', lg: 'block' } }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="caption" color="text.secondary">
                Workflow Progress
              </Typography>
              <Chip
                label={`${completedSteps}/${steps.length} complete`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Stack>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 99,
                bgcolor: alpha(theme.palette.primary.main, 0.16),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 99,
                  background: `linear-gradient(90deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                },
              }}
            />
          </Box>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={designState.turbo_mode ?? false}
                  onChange={(event) => handleTurboToggle(event.target.checked)}
                />
              }
              label="Turbo"
              sx={{ ml: 0, mr: 0.5, display: { xs: 'none', sm: 'inline-flex' } }}
            />
            <Tooltip title="Clear Project Data">
              <IconButton onClick={handleClear} color="error" size="small">
                <ClearIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Save Project">
              <IconButton onClick={handleSave} size="small">
                <SaveIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Load Project (file)">
              <IconButton onClick={handleLoadClick} size="small">
                <LoadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {/* Cloud save/load */}
            <Tooltip title="Save session to cloud">
              <IconButton
                onClick={() => { setSessionName(''); setCloudSaveOpen(true); }}
                size="small"
                color="primary"
                disabled={isSaving}
              >
                {isSaving ? <CircularProgress size={16} /> : <CloudSaveIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Load session from cloud">
              <IconButton onClick={handleOpenCloudLoad} size="small" color="primary">
                <CloudLoadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton onClick={() => setActiveStep('settings')} size="small">
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <StatusIndicator />
            <Tooltip title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              <IconButton onClick={onToggleTheme} size="small">
                {isDarkMode ? <LightIcon fontSize="small" /> : <DarkIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>

      {/* Cloud Save dialog */}
      <Dialog open={cloudSaveOpen} onClose={() => setCloudSaveOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Save Session to Cloud</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Session name"
            placeholder="e.g. Ethylene Plant Concept Rev 0"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCloudSave(); }}
            sx={{ mt: 1 }}
            size="small"
          />
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, px: 3, pb: 2 }}>
          <IconButton onClick={() => setCloudSaveOpen(false)} size="small" sx={{ mr: 'auto' }}>
            Cancel
          </IconButton>
          <IconButton
            onClick={handleCloudSave}
            disabled={!sessionName.trim() || isSaving}
            size="small"
            color="primary"
          >
            {isSaving ? <CircularProgress size={14} /> : <CloudSaveIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Dialog>

      {/* Cloud Load dialog */}
      <Dialog open={cloudLoadOpen} onClose={() => setCloudLoadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Load Session from Cloud</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : savedItems.length === 0 ? (
            <Typography sx={{ p: 3, textAlign: 'center' }} color="text.secondary">
              No saved sessions yet.
            </Typography>
          ) : (
            <List dense>
              {savedItems.map((session) => (
                <ListItem key={session.id} disablePadding>
                  <ListItemButton onClick={() => handleLoadSession(session)}>
                    <ListItemText
                      primary={session.name}
                      secondary={`Status: ${session.status ?? 'active'} · ${session.createdAt ? new Date(session.createdAt).toLocaleDateString() : ''}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 3, pb: 2 }}>
          <IconButton onClick={() => setCloudLoadOpen(false)} size="small">Close</IconButton>
        </Box>
      </Dialog>
    </>
  );
};
