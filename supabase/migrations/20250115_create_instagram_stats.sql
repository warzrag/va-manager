-- Create instagram_stats table
CREATE TABLE instagram_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  date DATE NOT NULL,
  followers_count INTEGER NOT NULL DEFAULT 0,
  following_count INTEGER,
  posts_count INTEGER,
  engagement_rate DECIMAL(5,2),
  va_id UUID REFERENCES vas(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_instagram_stats_organization_id ON instagram_stats(organization_id);
CREATE INDEX idx_instagram_stats_username ON instagram_stats(username);
CREATE INDEX idx_instagram_stats_date ON instagram_stats(date);
CREATE INDEX idx_instagram_stats_va_id ON instagram_stats(va_id);
CREATE INDEX idx_instagram_stats_creator_id ON instagram_stats(creator_id);

-- Enable Row Level Security
ALTER TABLE instagram_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view Instagram stats from their organization" ON instagram_stats
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert Instagram stats in their organization" ON instagram_stats
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update Instagram stats in their organization" ON instagram_stats
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete Instagram stats in their organization" ON instagram_stats
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_instagram_stats_updated_at
  BEFORE UPDATE ON instagram_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
