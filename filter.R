library("dplyr")

deps<-read.csv("react_deps.csv")
repos<-read.csv("repos.csv")
tidy_repos<-deps %>% inner_join(repos)
temp<-out %>% select(dependency) %>% mutate(name=dependency) %>% select(name)
tidy_repos<-tidy_repos %>% anti_join(temp) %>% unique()

library("tidyr")
num_of_deps<-tidy_repos %>% select(repo, isDev) %>% 
  group_by(repo, isDev) %>% count() %>% 
  spread(isDev, n, fill=0) %>% ungroup() %>%
  rename("dependencies"=`0`, "devDependencies"=`1`)
boxplot.stats(num_of_deps$dependencies)$stat
# [1] 1  5 10 20 42
boxplot.stats(num_of_deps$devDependencies)$stat
# [1] 0  5 13 24 52

outliers<-num_of_deps %>% 
  mutate(total_deps=dependencies+devDependencies) %>%
  arrange(desc(total_deps)) %>% head(20) %>%
  mutate(link=paste("https://github.com",repo, sep="/")) %>%
  select(link, dependencies, devDependencies)
