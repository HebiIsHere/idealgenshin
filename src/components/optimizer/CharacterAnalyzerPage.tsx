import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import CalculateIcon from '@mui/icons-material/Calculate';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import CharacterSetupTab from './CharacterSetupTab';
import DamageCalcTab from './DamageCalcTab';
import AnalysisTab from './AnalysisTab';
import { useCharacterStore } from '../../store/slices/characterSlice';
import { useSaveStore } from '../../store/slices/saveSlice';

/** Tab 面板容器。 */
function TabPanel({
  children,
  value,
  index,
}: {
  children: React.ReactNode;
  value: number;
  index: number;
}): React.ReactElement | null {
  return (
    <Box
      role="tabpanel"
      hidden={value !== index}
      id={`analyzer-tabpanel-${index}`}
      aria-labelledby={`analyzer-tab-${index}`}
      sx={{ py: 3 }}
    >
      {value === index && children}
    </Box>
  );
}

/**
 * CharacterAnalyzerPage — 统一角色分析页面。
 * 3个Tab: 角色与装备 / 伤害计算 / 词条分析
 * 顶部标题栏含"保存角色"按钮。
 */
function CharacterAnalyzerPage(): React.ReactElement {
  const [activeTab, setActiveTab] = useState(0);
  const { selectedCharacter, isResultExpired } = useCharacterStore();
  const { saveCurrent } = useSaveStore();
  const [showExpiredHint, setShowExpiredHint] = useState(false);

  // 切换Tab时检查数据是否过期
  useEffect(() => {
    if (activeTab > 0 && isResultExpired) {
      setShowExpiredHint(true);
    } else {
      setShowExpiredHint(false);
    }
  }, [activeTab, isResultExpired]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSave = () => {
    saveCurrent();
  };

  return (
    <Container maxWidth="xl">
      {/* 页面标题 + 保存按钮 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, pt: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
          角色分析
        </Typography>
        <Button
          variant="outlined"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={!selectedCharacter}
          size="small"
        >
          保存角色
        </Button>
      </Box>

      {/* 过期提示 */}
      {showExpiredHint && (
        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
          角色数据已更新，请重新计算以获取最新结果
        </Alert>
      )}

      {/* Tab 标签 */}
      <Paper sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<PersonIcon />} iconPosition="start" label="角色与装备" />
          <Tab icon={<CalculateIcon />} iconPosition="start" label="伤害计算" />
          <Tab icon={<AnalyticsIcon />} iconPosition="start" label="词条分析" />
        </Tabs>
      </Paper>

      {/* Tab 面板 */}
      <TabPanel value={activeTab} index={0}>
        <CharacterSetupTab />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <DamageCalcTab />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <AnalysisTab />
      </TabPanel>
    </Container>
  );
}

export default CharacterAnalyzerPage;
