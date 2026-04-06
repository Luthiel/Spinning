package service

import (
	"math"
	"sort"
	"strings"

	"gorm.io/gorm"

	"spinning/backend/internal/model"
)

type SkillService struct {
	db *gorm.DB
}

func NewSkillService(db *gorm.DB) *SkillService {
	return &SkillService{db: db}
}

func (s *SkillService) List(search, category, sortBy string) ([]model.Skill, error) {
	q := s.db.Model(&model.Skill{})
	if search != "" {
		like := "%" + strings.ToLower(search) + "%"
		q = q.Where("LOWER(name) LIKE ? OR LOWER(description) LIKE ?", like, like)
	}
	switch sortBy {
	case "calls":
		q = q.Order("call_count DESC")
	case "name":
		q = q.Order("name ASC")
	default:
		q = q.Order("rank_score DESC, call_count DESC")
	}

	var skills []model.Skill
	if err := q.Find(&skills).Error; err != nil {
		return nil, err
	}

	// Filter by category in-memory (category is stored as JSON array)
	if category != "" {
		filtered := skills[:0]
		for _, sk := range skills {
			for _, c := range sk.Category {
				if strings.EqualFold(c, category) {
					filtered = append(filtered, sk)
					break
				}
			}
		}
		skills = filtered
	}

	return skills, nil
}

func (s *SkillService) Get(id string) (*model.Skill, error) {
	var sk model.Skill
	if err := s.db.First(&sk, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &sk, nil
}

func (s *SkillService) Create(sk *model.Skill) error {
	return s.db.Create(sk).Error
}

func (s *SkillService) Update(id string, updates map[string]interface{}) (*model.Skill, error) {
	if err := s.db.Model(&model.Skill{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}
	return s.Get(id)
}

func (s *SkillService) Delete(id string) error {
	return s.db.Delete(&model.Skill{}, "id = ?", id).Error
}

func (s *SkillService) IncrCallCount(id string) {
	s.db.Model(&model.Skill{}).Where("id = ?", id).
		UpdateColumn("call_count", gorm.Expr("call_count + 1"))
}

// Clusters groups skills by their primary category and computes aggregate stats
func (s *SkillService) Clusters() ([]model.SkillCluster, error) {
	var skills []model.Skill
	if err := s.db.Find(&skills).Error; err != nil {
		return nil, err
	}

	groups := map[string][]model.Skill{}
	for _, sk := range skills {
		key := "other"
		if len(sk.Category) > 0 {
			key = strings.ToLower(sk.Category[0])
		}
		groups[key] = append(groups[key], sk)
	}

	clusterColors := []string{"#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"}
	clusters := make([]model.SkillCluster, 0, len(groups))
	idx := 0
	for label, grpSkills := range groups {
		var totalCalls int64
		for _, sk := range grpSkills {
			totalCalls += sk.CallCount
		}
		avgScore := 0.0
		if len(grpSkills) > 0 {
			var total float64
			for _, sk := range grpSkills {
				total += sk.RankScore
			}
			avgScore = total / float64(len(grpSkills))
		}
		clusters = append(clusters, model.SkillCluster{
			ID:          idx,
			Label:       strings.Title(label),
			Description: label + " skills",
			Skills:      grpSkills,
			Color:       clusterColors[idx%len(clusterColors)],
			TotalCalls:  totalCalls,
			AvgScore:    avgScore,
		})
		idx++
	}

	sort.Slice(clusters, func(i, j int) bool {
		return clusters[i].TotalCalls > clusters[j].TotalCalls
	})
	return clusters, nil
}

// Rankings returns skills sorted by composite rank score
func (s *SkillService) Rankings() ([]model.SkillRanking, error) {
	var skills []model.Skill
	if err := s.db.Order("call_count DESC").Find(&skills).Error; err != nil {
		return nil, err
	}

	rankings := make([]model.SkillRanking, len(skills))
	for i, sk := range skills {
		capScore := float64(len(sk.Capabilities)) * 10.0
		rankScore := float64(sk.CallCount)*2.0 + capScore
		// Clamp rank score for normalisation
		rankScore = math.Round(rankScore*100) / 100

		trend := "stable"
		if i < len(skills)/3 {
			trend = "up"
		} else if i > len(skills)*2/3 {
			trend = "down"
		}

		rankings[i] = model.SkillRanking{
			Skill:           sk,
			Rank:            i + 1,
			CallCount:       sk.CallCount,
			CapabilityScore: capScore,
			RankScore:       rankScore,
			Trend:           trend,
		}
	}
	return rankings, nil
}
