// controller/PageController.java
// Serves all HTML pages. Add authentication checks here later.

package com.example.hireiqse.controller;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    @GetMapping("/")
    public String home() {
        return "forward:/components/index.html";
    }

    @GetMapping("/landing")
    public String landing(Authentication authentication) {
        if (hasRole(authentication, "ROLE_ADMIN")) {
            return "redirect:/admin/dashboard";
        }
        if (hasRole(authentication, "ROLE_USER")) {
            return "redirect:/user-dashboard";
        }
        return "forward:/components/index.html";
    }

    @GetMapping("/index")
    public String index() {
        return "forward:/components/index.html";
    }

    @GetMapping("/login")
    public String login() {
        return "forward:/components/login.html";
    }

    @GetMapping("/home")
    public String hrHome() {
        return "forward:/components/home.html";
    }

    @GetMapping("/dashboard")  public String dashboard()        { return "forward:/components/dashboard.html"; }
    @GetMapping("/upload")     public String upload()           { return "forward:/components/upload.html"; }
    @GetMapping("/job-input")  public String jobInput()         { return "forward:/components/job-input.html"; }
    @GetMapping("/rankings")   public String rankings()         { return "forward:/components/rankings.html"; }
    @GetMapping("/candidate")  public String candidateDetail()  { return "forward:/components/candidate-detail.html"; }
    @GetMapping("/comparison") public String comparison()       { return "forward:/components/comparison.html"; }
    @GetMapping("/chat")       public String chat()            { return "forward:/components/chat.html"; }  // Member 02
    @GetMapping("/interview")  public String interview()        { return "forward:/components/interview.html"; }
    @GetMapping("/jd-analyzer")public String jdAnalyzer()       { return "forward:/components/jd-analyzer.html"; }
    @GetMapping("/kanban")
    public String kanban() {
        return "forward:/components/kanban.html";
    }

    @GetMapping("/admin/dashboard")
    public String adminDashboard() {
        return "forward:/components/admin-dashboard.html";
    }

    @GetMapping("/user-dashboard")
    public String userDashboard() {
        return "forward:/components/user-dashboard.html";
    }

    @GetMapping("/access-denied")
    public String accessDenied() {
        return "forward:/components/access-denied.html";
    }

    private boolean hasRole(Authentication authentication, String role) {
        if (authentication == null) {
            return false;
        }
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            if (role.equals(authority.getAuthority())) {
                return true;
            }
        }
        return false;
    }
}
